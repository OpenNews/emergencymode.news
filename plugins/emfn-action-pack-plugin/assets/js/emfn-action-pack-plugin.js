// @ts-check (drives Type checking in modern editors)
// EMFN Action Pack Plugin - client-side behaviors
"use strict";

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

const version = "0.6.08"; // debugging versioning
const riskThreshold = 50; // threshold for suggested risks 
const emfnWindow = /** @type {EmfnWindow} */ (window);

/** @type {EmfnData} - path exposed by plugin */
const { 
  dataUrl, 
  actionPackPayloadPrefix = "ap2.",
} = emfnWindow.emfnData || {
  dataUrl: null,
  actionPackPayloadPrefix: "ap2.",
};

// prevent duplicate initialization and listener registration
let hasInitializedSubmissionBinding = false;
let isGeoFeaturesActivated = false;
let hasResolvedGeolocation = false;
let hasRenderedRisks = false;
let hasBoundSubmissionFilter = false;

// DOM selectors
const gravityForm = /** @type {string} */ ("form.emfn-forms");
const fipsFieldSelection = /** @type {string} */ (`.countyFIPS input`);

/**
 * global helper: get the current Gravity Form node at the moment of use
 * (Gravity Forms replaces the form element across page-breaks)
 * @returns {HTMLFormElement | null}
 */
const getGravityForm = () => {
  return /** @type {HTMLFormElement | null} */ (document.querySelector(gravityForm));
}

// in-memory location state for the current quiz session
const locData = /** @type {LocationData} */ ({
  county: null,
  state: null,
  st: null,
  country: null,
  fips: null,
});

const GeolocationFlow = {
  /** @type {string} */
  gravityGeoInput: `.location[data-js='geolocation-enabled']`,

  /**
   * Clear persisted and in-memory location state before handling a new place selection
   * @returns {void}
   */
  clearPersistedLocation() {
    try {
      sessionStorage.removeItem("emfn_locData");
    } catch (err) {
      console.warn("Unable to clear location data from sessionStorage:", err);
    }

    locData.county = null;
    locData.state = null;
    locData.st = null;
    locData.country = null;
    locData.fips = null;

    hasResolvedGeolocation = false;
    hasRenderedRisks = false;
    RiskRenderer.lastFetchedCountyState = null;
    RiskRenderer.lastFetchedCountyFips = null;
    RiskRenderer.lastFetchedNriData = null;

    const formRoot = getGravityForm();
    if (!formRoot) {
      return;
    }

    const risks = /** @type {HTMLDivElement | null} */ (
      formRoot.querySelector("#risks")
    );

    if (risks) {
      delete risks.dataset.emfnRendered;
      Array.from(risks.children).forEach((child) => {
        if (["risk-template"].includes(child.id)) return;
        child.remove();
      });
    }
  },

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
    const formRoot = getGravityForm();
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
        GeolocationFlow.clearPersistedLocation();
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
  /** @type {string|null} */
  lastFetchedCountyState: null,

  /** @type {string|null} */
  lastFetchedCountyFips: null,

  /** @type {NriCountyRow|null} */
  lastFetchedNriData: null,

  /** @type {Object.<string, string>} */
  hazardLabels: {
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
  },

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
      RiskRenderer.lastFetchedCountyState === st
      && RiskRenderer.lastFetchedCountyFips === countyFIPS
      && RiskRenderer.lastFetchedNriData !== null
    );

    if (hasCachedCountyData) {
      return RiskRenderer.lastFetchedNriData;
    }

    const nriData = await RiskRenderer.fetchNriData(st, countyFIPS);
    if (!nriData) {
      return null;
    }

    RiskRenderer.lastFetchedCountyState = st;
    RiskRenderer.lastFetchedCountyFips = countyFIPS;
    RiskRenderer.lastFetchedNriData = nriData;

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
      if (["risk-template"].includes(child.id)) return;
      child.remove();
    });
  },

  /**
   * Render a visible fallback row while preserving the hidden template node.
   * @param {HTMLElement} risks - the root risk section DOM element
   * @param {HTMLElement} risksTemplate - the hidden risk template DOM element
   * @returns {void}
   */
  renderFallbackRisk(risks, risksTemplate) {
    const fallbackElements = RiskRenderer.createRiskElements(risks, risksTemplate);
    if (!fallbackElements) {
      return;
    }

    const { riskItem, riskRegion, riskType } = fallbackElements;
    if (riskItem) riskItem.textContent = locData.county ?? "Unable to resolve location";
    if (riskRegion) riskRegion.textContent = locData.state ?? "Location unavailable";
    riskType.textContent = [
      "Unable to determine specific risks for your location.",
      "Please try a broader location (e.g. just city or state)."
    ].join(" ");
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
      .map(([key, val]) => [RiskRenderer.hazardLabels[key.replace("_risk_score", "").toLowerCase()] ?? null, parseFloat(val)])
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
    const formRoot = getGravityForm();
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

    if (riskItem) riskItem.textContent = locData.county ?? "Unable to resolve location";
    if (riskRegion) riskRegion.textContent = locData.state ?? "Missing";
    if (riskType) riskType.textContent = "Resolving risks based on your location...";
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
   * @param {HTMLElement} risks - the DOM element to populate with fallback text
   * @param {HTMLElement} risksTemplate - the hidden risk template DOM element
   * @returns {void} - populates the risks element with fallback copy for users
   */
  showMissingData(risks, risksTemplate) {
    RiskRenderer.clearRenderedRisks(risks);
    RiskRenderer.renderFallbackRisk(risks, risksTemplate);
  },

  /**
   * Populate user-facing Risks section with geolocation + NRI data
   * @returns {Promise<void>} - risk data based on FIPS + state
   */
  async mapLocationToRisks() {
    const formRoot = getGravityForm();
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
    GeolocationFlow.restore();

    if (!risks || !risksTemplate) {
      console.error("Required DOM for mapping location to risks not found.");
      return;
    }

    hasRenderedRisks = risks.dataset.emfnRendered === "1";
    if (hasRenderedRisks) return;

    hasRenderedRisks = true;
    risks.dataset.emfnRendered = "1";

    const resolvedLocation = RiskRenderer.getResolvedLocation();
    if (!resolvedLocation) {
      RiskRenderer.resetRendering(risks);
      console.error("No County FIPS code available");
      RiskRenderer.showMissingData(risks, risksTemplate);
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
      RiskRenderer.showMissingData(risks, risksTemplate);
      return;
    }

    const likelyHazards = RiskRenderer.deriveLikelyHazards(nriData);
    if (!likelyHazards.length) {
      console.error("No high-risk hazards found for FIPS", resolvedFips);
    }

    RiskRenderer.renderRiskList(riskElements.riskType, likelyHazards);
  },
};

const SubmissionHashing = {
  /** @type {string[]} */
  resolvedActionPackTokenOrder: [],

  /** @type {Promise<string[]> | null} */
  actionPackTokenOrderPromise: null,

  /**
   * Resolve the canonical Action Pack token order, falling back to the CSV asset
   * when older PHP does not localize it.
   * @returns {Promise<string[]>}
   */
  async ensureActionPackTokenOrder() {
    if (SubmissionHashing.resolvedActionPackTokenOrder.length > 0) {
      return SubmissionHashing.resolvedActionPackTokenOrder;
    }

    if (!dataUrl) {
      console.warn("Action Pack token order is unavailable; compact payload encoding disabled.");
      return [];
    }

    if (!SubmissionHashing.actionPackTokenOrderPromise) {
      SubmissionHashing.actionPackTokenOrderPromise = SubmissionHashing.fetchActionPackTokenOrder();
    }

    return SubmissionHashing.actionPackTokenOrderPromise;
  },

  /**
   * Load token order from the CSV registry asset.
   * @returns {Promise<string[]>}
   */
  async fetchActionPackTokenOrder() {
    /** @type {string|null} */
    let csvData = null;

    try {
      const csvBaseUrl = dataUrl.replace(/\/$/, "");
      const csvUrl = `${csvBaseUrl}/_tallCategories.csv`;
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${csvUrl}`);
      csvData = await res.text();
      if (!csvData) throw new Error("Empty CSV response");
    } catch (err) {
      console.warn("Unable to load Action Pack token order from CSV:", err);
      return [];
    }

    const lines = csvData.trim().split(/\r?\n/);
    const [, ...rows] = lines;

    // use a Set to dedupe tokens while preserving order from the CSV
    const tokenOrderSet = rows.reduce((tokens, row) => {
      const entryId = row.split(",")[0]?.trim() ?? "";
      if (entryId) tokens.add(entryId);
      return tokens;
    }, new Set());

    SubmissionHashing.resolvedActionPackTokenOrder = Array.from(tokenOrderSet);
    console.debug(`Resolved Action Pack token order:`, SubmissionHashing.resolvedActionPackTokenOrder);
    if (SubmissionHashing.resolvedActionPackTokenOrder.length === 0) {
      console.warn("Action Pack token order CSV did not yield any tokens.");
    }

    return SubmissionHashing.resolvedActionPackTokenOrder;
  },

  /**
   * Schedule submission binding exactly once across all startup states
   * @returns {void}
   */
  initializeSubmissionHandling() {
    if (hasInitializedSubmissionBinding) {
      return;
    }

    hasInitializedSubmissionBinding = true;

    if (emfnWindow.gform?.themeScriptsLoaded) {
      SubmissionHashing.controlFormSubmission();
      return;
    }

    document.addEventListener(
      "gform/theme/scripts_loaded",
      () => {
        SubmissionHashing.controlFormSubmission();
      },
      { once: true }
    );
  },

  /**
   * Pack canonical Action Pack values into compact 31-bit segments
   * @param {string[]} hashableValues - ordered, semantic values to encode
   * @returns {number[]}
   */
  packActionPackBits(hashableValues) {
    const packedSegments = []; // use an array to avoid JS bitwise math pitfalls
    const segmentSize = 31;
    const actionPackTokenIndex = new Map(
      SubmissionHashing.resolvedActionPackTokenOrder.map((token, index) => [token, index])
    );

    for (const token of hashableValues) {
      const tokenIndex = actionPackTokenIndex.get(token);
      if (tokenIndex === undefined) {
        continue;
      }

      // each segment stores 31 token flags so JS bitwise math stays predictable
      const segmentIndex = Math.floor(tokenIndex / segmentSize);
      const bitIndex = tokenIndex % segmentSize;

      // build up segments
      while (packedSegments.length <= segmentIndex) { packedSegments.push(0); }

      // turn on the bit for this token inside its segment.
      packedSegments[segmentIndex] |= 1 << bitIndex;
    }

    if (packedSegments.length === 0) packedSegments.push(0);
    return packedSegments;
  },

  /**
   * Collect ordered, semantic values from controls inside `fieldset.hashable`.
   * Each value already contains its key (as a prefix), separated from the value 
   * by the first dash
   * @param {HTMLFormElement} form - the active Gravity Form element
   * @returns {string[]}
   */
  collectHashableValues(form) {
    /** @type {Set<string>} */
    const uniqueHashableValues = new Set(); // use a Set to dedupe values before ordering
    const actionPackTokenSet = new Set(SubmissionHashing.resolvedActionPackTokenOrder); // quick lookup of known tokens

    if (SubmissionHashing.resolvedActionPackTokenOrder.length === 0) return [];

    // collect values that are inside fieldset.hashable DOM and match known tokens
    new FormData(form).forEach((value, name) => {
      const hashableControl = form.querySelector(
        `fieldset.hashable [name="${CSS.escape(name)}"]`
      );
      const cleanTxt = String(value).trim();

      // only include values that also match known Action Pack tokens
      if (hashableControl && actionPackTokenSet.has(cleanTxt)) {
        uniqueHashableValues.add(cleanTxt);
      }
    });

    // keep known, unique values in the order dictated by actionPackTokenOrder
    const hashableValues = SubmissionHashing.resolvedActionPackTokenOrder.filter((token) => 
      uniqueHashableValues.has(token)
    );

    console.debug(`Collected hashable form values:`, hashableValues);
    if (hashableValues.length === 0) {
      console.warn("No hashable fieldset values found (unlikely edge case)");
      return [];
    }

    return hashableValues;
  },

  /**
  * Intercept form submission and writes hashed submission values to .hashMarker input
   * @returns {void}
   */
  controlFormSubmission() {
    if (hasBoundSubmissionFilter) {
      console.debug("Submission filter already bound; skipping duplicate binding");
      return;
    }
    
    // block form submission until hash is set to hidden form field
    const gformsReady = emfnWindow.gform?.utils;
    if (!gformsReady?.addAsyncFilter) {
      console.warn("Gravity Forms utils not available; Action Pack payload encoding disabled.");
      return;
    }

    gformsReady.addAsyncFilter("gform/submission/pre_submission", async (data) => {
      // only run on final submit, not form pagination or other submission types
      const submitType = emfnWindow.gform?.submission?.SUBMISSION_TYPE_SUBMIT;
      if (submitType && data.submissionType !== submitType) return data;

      // ignore any non-ActionPack gravity form instances
      if (!data.form || !data.form.matches(gravityForm)) return data;

      await SubmissionHashing.ensureActionPackTokenOrder();

      // set the encoded payload to the hidden .hashMarker input
      const hashMarkerField = /** @type {HTMLInputElement | null} */ (
        data.form.querySelector(".hashMarker input")
      );
      if (!hashMarkerField) {
        console.error(".hashMarker not found, unable to store Action Pack payload");
        return data;
      }
      
      // select the `.hashable`-marked values from current form content
      const hashableValues = SubmissionHashing.collectHashableValues(data.form);
      console.debug(`Serialized hashable form values:`, hashableValues);

      // pack the hashable values into compact bit segments 
      const bits = SubmissionHashing.packActionPackBits(hashableValues);
      // encode as base36 for a shorter string
      const base36Segs = Array.from({ length: bits.length }, (_, index) => bits[index] ?? 0)
        .map((segment) => segment.toString(36))
        .join(".");
        
      // prepend the payload prefix to identify and namespace the hash in the backend
      hashMarkerField.value = `${actionPackPayloadPrefix}${base36Segs}`;

      // data.abort = true; // DEBUGGING uncomment to block submission
      return data;
    });

    hasBoundSubmissionFilter = true;
    return;
  },
}

/* ********* INITIALIZATION **********
* - bind to Gravity Forms submission event to create hashes
* - bind to Places v2 autocomplete selection for geolocation and risk mapping
* - both have guards to prevent duplicate bindings in case of multiple form renders 
*   or script load events
*/
console.info("EMFN Action Pack Plugin active", version);

SubmissionHashing.initializeSubmissionHandling();

if (!isGeoFeaturesActivated) {
  isGeoFeaturesActivated = true;

  // this must be a document-level binding
  document.addEventListener("gform/post_render", () => {
    const formRoot = getGravityForm();
    if (!formRoot) {
      console.error(`${gravityForm} not found on gform/post_render`);
      return;
    }
    
    GeolocationFlow.restore();

    const geoInput = /** @type {GFormElement | null} */ (
      formRoot.querySelector(GeolocationFlow.gravityGeoInput)
    );

    if (geoInput && !hasResolvedGeolocation) {
      GeolocationFlow.bindPlaceSelection(geoInput);
    }

    const riskSection = /** @type {HTMLDivElement | null} */ (
      formRoot.querySelector("#risks") ?? null
    );
    if (riskSection && Boolean(locData.fips) && riskSection.dataset.emfnRendered !== "1") {
      void RiskRenderer.mapLocationToRisks().catch((error) => {
        console.error("Error mapping location to risks:", error);
      });
    }
  });
}