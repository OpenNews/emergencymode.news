// @ts-check (drives type checking in modern editors)
"use strict";

// EMFN Action Pack Plugin - client-side behaviors
// - geolocation result mapping to FEMA & NRI risk data
// - quiz result hashing for later correlation with user outcomes

/**
 * ********** TYPES **********
 * @typedef {import("../../../shared/emfn-types").EmfnData} EmfnData
 * @typedef {import("../../../shared/emfn-types").EmfnWindow} EmfnWindow
 * @typedef {import("../../../shared/emfn-types").GFormElement} GFormElement
 * @typedef {import("../../../shared/emfn-types").GFormCustomElement} GFormCustomElement
 * @typedef {import("../../../shared/emfn-types").LatLngLike} LatLngLike
 * @typedef {import("../../../shared/emfn-types").NriCountyRow} NriCountyRow
 * @typedef {import("../../../shared/emfn-types").LocationData} LocationData
 * @typedef {import("../../../shared/emfn-types").FccLookupResponse} FccLookupResponse
 * @typedef {import("../../../shared/emfn-types").PlaceLike} PlaceLike
 * @typedef {import("../../../shared/emfn-types").GmpSelectEvent} GmpSelectEvent
 * @typedef {import("../../../shared/emfn-types").GFormSubmissionStartedData} GFormSubmissionStartedData
 */

const version = "0.5.01"; // debugging versioning
const riskThreshold = 50; // threshold for suggested risks 

/** @type {EmfnWindow} */
const emfnWindow = window;

/** @type {EmfnData} - path exposed by plugin */
const { dataUrl } = emfnWindow.emfnData || { dataUrl: null };

// prevent duplicate post_render listener registration
let isGeoFeaturesActivated = false;
let hasResolvedGeolocation = false;
let hasRenderedRisks = false;
let hasBoundSubmissionFilter = false;

// store the last fetched data to avoid redundant fetches
/** @type {string|null} */
let lastFetchedCountyState = null;
/** @type {string|null} */
let lastFetchedCountyFips = null;
/** @type {NriCountyRow|null} */
let lastFetchedNriData = null;

// DOM selectors
/** @type {string} */
const gravityForm = "form.emfn-forms";
/** @type {string} */
const gravityGeoInput = `${gravityForm} .location[data-js='geolocation-enabled']`;
/** @type {string} */
const fipsFieldSelection = `${gravityForm} .countyFIPS input`;

/** 
 * @type {HTMLFormElement | null} 
 * important that this is one of the only document.querySelector() calls in file
 *  to ensure we are always targeting the correct form in Gravity Forms' multi-form 
 * environment, and not accidentally binding to stale DOM from a previous form "page"
 */
const gravityFormEl = document.querySelector(gravityForm);

/**
 * NRI hazard codes => human-friendly terms
 * @type {Object.<string, string>}
 */
const NRI_HAZARD_LABELS = {
  avln: "Avalanche",
  cfld: "Coastal Flooding",
  cwav: "Cold Wave",
  drgt: "Drought",
  erqk: "Earthquake",
  hail: "Hail",
  hwav: "Heat Wave",
  hrcn: "Hurricane",
  istm: "Ice Storm",
  lnds: "Landslide",
  ltng: "Lightning",
  ifld: "Inland Flooding",
  swnd: "Strong Wind",
  trnd: "Tornado",
  tsun: "Tsunami",
  vlcn: "Volcanic Activity",
  wfir: "Wildfire",
  wntw: "Winter Weather",
};

/**
 * in-memory location state for the current quiz session
 * @type {LocationData}
 */
const locData = {
  county: null,
  state: null,
  st: null,
  country: null,
  fips: null,
};

const GeolocationFlow = {
  /**
   * Persist resolved location data so later Gravity Forms "pages" can use it
   * @returns {void}
   */
  persist() {
    try {
      sessionStorage.setItem("emfn_locData", JSON.stringify({ ...locData }));
    } catch (err) {
      console.error("Unable to save location data to sessionStorage:", err);
    }
  },

  /**
   * Restore previously resolved location data into memory on later form renders
   * @returns {boolean}
   */
  restore() {
    try {
      const storedLocData = sessionStorage.getItem("emfn_locData");
      if (!storedLocData) return false;

      /** @type {Partial<LocationData> | null} */
      const parsedLocData = JSON.parse(storedLocData);
      if (!parsedLocData) return false;

      locData.county = locData.county ?? parsedLocData.county ?? null;
      locData.state = locData.state ?? parsedLocData.state ?? null;
      locData.st = locData.st ?? parsedLocData.st ?? null;
      locData.country = locData.country ?? parsedLocData.country ?? null;
      locData.fips = locData.fips ?? parsedLocData.fips ?? null;

      if (locData.st && locData.fips) {
        hasResolvedGeolocation = true;
        return true;
      }
    } catch (err) {
      console.warn("Unable to restore location data from sessionStorage:", err);
    }

    return false;
  },

  /**
   * Resolve county FIPS from the FCC Area API using Places v2 lat/lng
   * @param {LatLngLike} location - Places v2 location object
   * @returns {Promise<string|null>}
   */
  async getFipsFromFCC(location) {
    const lat = location.lat() ?? null;
    const lng = location.lng() ?? null;
    if (lat === null || lng === null) {
      console.error("Missing lat/lng from place location");
      return null;
    }

    try {
      const fipsRes = await fetch(
        `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`
      );

      /** @type {FccLookupResponse} */
      const fipsData = await fipsRes.json();

      return fipsData?.County?.FIPS ?? null;
    } catch (err) {
      console.error("FIPS lookup failed:", err);
    }

    return null;
  },

  /**
   * Handle one Places v2 selection and store the resolved location for later pages
   * @param {Event} event - response from the autocomplete selection
   * @returns {Promise<void>}
   */
  async handlePlaceSelection(event) {
    const { placePrediction } = /** @type {GmpSelectEvent} */ (/** @type {unknown} */ (event));
    const formRoot = gravityFormEl;
    if (!formRoot) {
      console.error("Targeted Gravity Form not found.");
      return;
    }

    if (!placePrediction || typeof placePrediction.toPlace !== "function") {
      console.error("Places v2 missing place data");
      return;
    }

    /** @type {PlaceLike} */
    const place = placePrediction.toPlace();
    if (!place || typeof place.fetchFields !== "function") {
      console.error("Places v2 missing place data");
      return;
    }

    await place.fetchFields({
      fields: [
        "addressComponents",
        "displayName",
        "formattedAddress",
        "location"
      ]
    });

    if (!place || !place.location || !place.addressComponents) {
      console.error("Places v2 missing address components or location data");
      return;
    }

    /** @type {Object.<string, string>} */
    const addr = (place.addressComponents ?? []).reduce(
      /** @param {Object.<string, string>} acc */
      (acc, { types = [], longText, shortText }) => {
        types.forEach((type) => {
          acc[type] = longText;
          acc[`${type}_short`] = shortText;
        });
        return acc;
      },
      /** @type {Object.<string, string>} */ ({})
    );

    locData.county = addr.administrative_area_level_2 ?? null;
    locData.state = addr.administrative_area_level_1 ?? null;
    locData.st = addr.administrative_area_level_1_short ?? null;
    locData.country = addr.country ?? null;
    locData.fips = await GeolocationFlow.getFipsFromFCC(place.location);

    /** @type {HTMLInputElement | null} */
    const fipsField = formRoot.querySelector(fipsFieldSelection);
    if (fipsField && locData.fips) {
      fipsField.value = locData.fips;
    } else {
      console.error("Unable to populate FIPS for submission.");
    }

    if (locData.st && locData.fips) {
      hasResolvedGeolocation = true;
      GeolocationFlow.persist();
      await RiskRenderer.mapLocationToRisks();
    }
  },

  /**
   * Bind to Places v2 autocomplete selection, resolve location data and map to FIPS
   * @param {GFormElement} geoInput - DOM for geolocation input and autocomplete
   * @returns {void}
   */
  bindPlaceSelection(geoInput) {
    /** @type {GFormCustomElement | null} */
    const autocompleteEl = /** @type {GFormCustomElement | null} */ (
      geoInput.querySelector("gmp-place-autocomplete")
    );
    if (!autocompleteEl || autocompleteEl.dataset.placeBound === "1") return;

    autocompleteEl.addEventListener("gmp-select", async (event) => {
      try {
        await GeolocationFlow.handlePlaceSelection(event);
      } catch (err) {
        console.error("Error handling place selection:", err);
        return null;
      }
    });

    autocompleteEl.dataset.placeBound = "1";
  },
};

const RiskRenderer = {
  /**
   * Fetch and parse a per-state NRI risk CSV (generated by notebooks/*.ipynb)
   * @param {string} st - state/province abbreviation (e.g. "GA")
   * @param {string} countyFIPS - 5-digit county FIPS code
   * @return {Promise<NriCountyRow|null>} - matched county risk data
   */
  async fetchNriData(st, countyFIPS) {
    if (!countyFIPS || !st || !dataUrl) {
      console.error("Missing data; cannot fetch NRI data.");
      return null;
    }

    /** @type {string|null} */
    let csvData = null;
    try {
      const res = await fetch(`${dataUrl.replace(/\/$/, "")}/${st}.csv`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      csvData = await res.text();
      if (!csvData) throw new Error("Empty CSV response");
    } catch (err) {
      console.error(`Invalid ${st}.csv:`, err);
      return null;
    }

    const [hed, ...lines] = csvData.trim().split("\n");
    const heds = hed.split(",");
    const fipsIndex = heds.findIndex((h) => h.trim() === "county_fips");
    const matchedLine = lines.find((line) => line.split(",")[fipsIndex]?.trim() === countyFIPS);

    /** @type {NriCountyRow|null} */
    const countyMatch = matchedLine
      ? Object.fromEntries(heds.map((h, i) => [h.trim(), matchedLine.split(",")[i]?.trim() ?? ""]))
      : null;

    if (countyMatch) return countyMatch;

    console.warn(`NRI data: county FIPS ${countyFIPS} not found in ${st}.csv`);
    return null;
  },

  /**
   * Return cached county risk data when the requested county has not changed
   * @param {string} st - state/province abbreviation (e.g. "GA")
   * @param {string} countyFIPS - 5-digit county FIPS code
   * @returns {Promise<NriCountyRow|null>}
   */
  async getCountyRiskData(st, countyFIPS) {
    const hasCachedCountyData = (
      lastFetchedCountyState === st
      && lastFetchedCountyFips === countyFIPS
      && lastFetchedNriData !== null
    );

    if (hasCachedCountyData) {
      return lastFetchedNriData;
    }

    const nriData = await RiskRenderer.fetchNriData(st, countyFIPS);
    if (!nriData) {
      return null;
    }

    lastFetchedCountyState = st;
    lastFetchedCountyFips = countyFIPS;
    lastFetchedNriData = nriData;

    return nriData;
  },

  /**
   * Reset the risk section render guard so a later attempt can re-render
   * @param {HTMLElement} risks - the root risk section DOM element
   * @returns {void}
   */
  resetRendering(risks) {
    hasRenderedRisks = false;
    delete risks.dataset.emfnRendered;
  },

  /**
   * Remove any previously rendered risk result nodes while preserving templates
   * @param {HTMLElement} risks - the root risk section DOM element
   * @returns {void}
   */
  clearRenderedRisks(risks) {
    Array.from(risks.children).forEach((child) => {
      if (["risk-explainer", "risk-template"].includes(child.id)) return;
      child.remove();
    });
  },

  /**
   * Build the ranked hazard labels from one county row
   * @param {NriCountyRow} nriData - the county risk data
   * @returns {string[]} - ranked hazards with risk percentages (e.g. "Hurricane (80%)")
   */
  deriveLikelyHazards(nriData) {
    /** @type {[string, number][]} */
    const likelyHazardScores = Object.entries(nriData)
      .filter(([key, val]) => key.endsWith("_risk_score") && parseFloat(val) >= riskThreshold)
      .map(([key, val]) => [NRI_HAZARD_LABELS[key.replace("_risk_score", "").toLowerCase()] ?? null, parseFloat(val)])
      .filter((entry) => entry[0] !== null)
      .map((entry) => /** @type {[string, number]} */ ([/** @type {string} */ (entry[0]), entry[1]]));

    return likelyHazardScores
      .sort(([, a], [, b]) => b - a)
      .map(([label, score]) => `${label} (${Math.round(score)}%)`);
  },

  /**
   * Resolve state and county FIPS from in-memory state and the scoped form fields
   * @returns {{ resolvedFips: string, resolvedSt: string } | null}
   */
  getResolvedLocation() {
    const formRoot = gravityFormEl;
    if (!formRoot) {
      return null;
    }

    /** @type {HTMLInputElement | null} */
    const fipsField = formRoot.querySelector(fipsFieldSelection);
    const resolvedFips = locData.fips ?? fipsField?.value ?? null;
    const resolvedSt = locData.st ?? null;

    if (!resolvedFips || !resolvedSt) {
      return null;
    }

    locData.fips = resolvedFips;
    locData.st = resolvedSt;
    GeolocationFlow.persist();

    return { resolvedFips, resolvedSt };
  },

  /**
   * Clone and insert the visible risk result container
   * @param {HTMLElement} risks - the root risk section DOM element
   * @param {HTMLElement} risksTemplate - the risk template DOM element
   * @returns {{ 
   *   riskItem: Element | null, 
   *   riskRegion: Element | null, 
   *   riskType: Element | null 
   * } | null} - the key DOM elements to populate with risk data
   */
  createRiskElements(risks, risksTemplate) {
    /** @type {HTMLElement} */
    const riskEl = /** @type {HTMLElement} */ (risksTemplate.cloneNode(true));
    riskEl.removeAttribute("id");
    const riskItem = riskEl.querySelector(".location");
    const riskRegion = riskEl.querySelector(".region");
    const riskType = riskEl.querySelector(".list");

    if (!riskType) {
      console.error("Risk .list DOM not found in risk template.");
      return null;
    }

    if (riskItem) riskItem.textContent = locData.county ?? "Unknown Location";
    if (riskRegion) riskRegion.textContent = locData.state ?? "Unknown State";
    riskEl.classList.remove("is-hidden");
    riskEl.classList.add("is-visible");
    risks.appendChild(riskEl);

    return { riskItem, riskRegion, riskType };
  },

  /**
   * Populate the user-facing risk list text
   * @param {Element} riskType - the DOM element to populate with risk text
   * @param {string[]} likelyHazards - the list of likely hazards
   * @returns {void} - populates the riskType element for users
   */
  renderRiskList(riskType, likelyHazards) {
    if (!likelyHazards.length) {
      riskType.textContent = "No high risk for any specific hazards based on our data.";
      return;
    }

    riskType.textContent = [
      `FEMA's >=${riskThreshold}% risks:`,
      likelyHazards.join(", ")
    ].join(" ");
  },

  /**
   * Show the user-facing fallback copy when location/risk data is unavailable
   * @param {HTMLElement} riskExplainer - the DOM element to populate with fallback text
   * @returns {void} - populates the riskExplainer element with fallback copy for users
   */
  showMissingData(riskExplainer) {
    riskExplainer.textContent = [
      "Unable to determine specific risks for your location.",
      "Please try a broader location (e.g. just city or state)."
    ].join(" ");
  },

  /**
   * Populate user-facing Risks section with geolocation + NRI data
   * @returns {Promise<void>} - risk data based on FIPS + state
   */
  async mapLocationToRisks() {
    const formRoot = gravityFormEl;
    if (!formRoot) {
      console.error("Targeted Gravity Form not found.");
      return;
    }

    const risks = /** @type {HTMLDivElement | null} */ (
      formRoot.querySelector("#risks")
    );
    const risksTemplate = /** @type {HTMLDivElement | null} */ (
      formRoot.querySelector("#risk-template")
    );
    const riskExplainer = /** @type {HTMLDivElement | null} */ (
      formRoot.querySelector("#risk-explainer")
    );
    GeolocationFlow.restore();

    if (!risks || !risksTemplate || !riskExplainer) {
      console.error("Required DOM for mapping location to risks not found.");
      return;
    }

    hasRenderedRisks = hasRenderedRisks || risks.dataset.emfnRendered === "1";
    if (hasRenderedRisks) {
      return;
    }

    hasRenderedRisks = true;
    risks.dataset.emfnRendered = "1";

    riskExplainer.innerHTML = "";

    const resolvedLocation = RiskRenderer.getResolvedLocation();
    if (!resolvedLocation) {
      RiskRenderer.resetRendering(risks);
      console.error("No County FIPS code available");
      RiskRenderer.showMissingData(riskExplainer);
      return;
    }

    RiskRenderer.clearRenderedRisks(risks);

    const riskElements = RiskRenderer.createRiskElements(risks, risksTemplate);
    if (!riskElements) {
      RiskRenderer.resetRendering(risks);
      return;
    }

    const { resolvedFips, resolvedSt } = resolvedLocation;
    const nriData = await RiskRenderer.getCountyRiskData(resolvedSt, resolvedFips);
    if (!nriData) {
      RiskRenderer.resetRendering(risks);
      console.error("No NRI data available for FIPS", resolvedFips);
      RiskRenderer.showMissingData(riskExplainer);
      return;
    }

    const likelyHazards = RiskRenderer.deriveLikelyHazards(nriData);
    if (!likelyHazards.length) {
      console.error("No high-risk hazards found for FIPS", resolvedFips);
    }

    RiskRenderer.renderRiskList(riskElements.riskType, likelyHazards);
  },
};

const QuizResultHashing = {
  /**
   * Hash the form data string for later retrieval and correlation with quiz results
   * (not cryptographically secure, just a quick way to compress form submissions)
   * @param {string} dataString - the serialized form data string to hash
   * @returns {string} - the resulting hash string to store and correlate with quiz results
   */
  createHash(dataString) {
    let hash = 5381; // common seed used in the djb2 family of hash functions

    // iterate over the form data string, update hash using bitwise operations
    for (let i = 0; i < dataString.length; i++) {
      hash = Math.imul(hash, 33) ^ dataString.charCodeAt(i);
    }

    // ensure positive — mirrors PHP CRC32_OVERFLOW constant
    if (hash < 0) hash += 0x100000000;
    return hash.toString(36); // convert to base36 for compact storage (0-9, a-z)
  },

  /**
   * Intercept form submission via `gform/submission/pre_submission` 
   * - computes a hash and write it to the .hashMarker hidden input
   * - blocks submission until hash is set
   * @returns {Promise<void>} - but modifies form data before submission
   */
  controlFormSubmission() {
    if (hasBoundSubmissionFilter) {
      return;
    }

    const submitType = emfnWindow.gform?.submission?.SUBMISSION_TYPE_SUBMIT;
    
    // block form submission until hash is set to hidden form field
    const gformsReady = emfnWindow.gform?.utils;
    if (!gformsReady?.addAsyncFilter) { 
      console.error("Gravity Forms utils not available; quiz result hashing disabled.");
      /** @TODO - consider fallback form-submission binding */
      return;
    }

    hasBoundSubmissionFilter = true;
    
    gformsReady.addAsyncFilter("gform/submission/pre_submission",
      /** @param {GFormSubmissionStartedData} data */ 
      async (data) => {
        // Only hash real `submit` actions, not next/previous/save-continue actions.
        if (submitType && data.submissionType !== submitType) return data;
        if (!data.form || !data.form.matches(gravityForm)) return data;
      
        console.debug("Pre-submission data:", data);
        /** @TODO */
        // data.abort = true; // temporary, leave in place until testing is complete
        return data;
    });

    return;
  },
}

/* ********* INITIALIZATION **********
* Register one Gravity Forms post_render hook for the whole page. That event
* wires the Places autocomplete once, and the later risk DOM is populated only
* from a successful gmp-select flow after state + county FIPS are resolved.
*/
if (!isGeoFeaturesActivated) {
  isGeoFeaturesActivated = true;

  console.info("EMFN Action Pack Plugin active", version);

  // this must be a document-level binding
  document.addEventListener("gform/post_render", () => {
    if (!gravityFormEl) {
      console.error("Targeted Gravity Form not found on `post_render`");
      return;
    }
    
    GeolocationFlow.restore();

    const geoInput = /** @type {GFormElement | null} */ (
      gravityFormEl.querySelector(gravityGeoInput)
    );

    if (geoInput && !hasResolvedGeolocation) {
      GeolocationFlow.bindPlaceSelection(geoInput);
    }

    const riskSection = /** @type {HTMLDivElement | null} */ (
      gravityFormEl.querySelector("#risks") ?? null
    );
    if (riskSection && Boolean(locData.fips) && !hasRenderedRisks) {
      void RiskRenderer.mapLocationToRisks().catch((error) => {
        console.error("Error mapping location to risks:", error);
      });
    }

    void QuizResultHashing.controlFormSubmission();
  });
}