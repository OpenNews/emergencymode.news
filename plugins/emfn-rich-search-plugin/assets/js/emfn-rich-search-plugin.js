/**
 * EMFN Rich Search Plugin – front-end scripts
 *
 * Add plugin-specific JavaScript below.
 * The file is loaded in the footer (true passed as last arg to wp_enqueue_script).
 */
// Version for debugging purposes
const version = "0.2.06";

// Selectors
const gravityForm = "form.emfn-forms";
const gravityGeoInput = `${gravityForm} .location[data-js='geolocation-enabled']`;
const customSearchInput = ".search input[type='text']";

/* ********* TYPES ***********/
/**
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

/* ********* SUBMISSION HASHING ***********/

// prevent duplicate bindings on gform submission
let isSubmissionHookBound = false;

/** @type {EmfnWindow} */
const emfnWindow = window;

/**
 * Generate a compact base36 hash from a string (djb2 algorithm, synchronous).
 * @param {string} str
 * @returns {string} base36-encoded positive 32-bit hash
 */
const hashFormData = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(hash, 33) ^ str.charCodeAt(i);
  }

  // ensure positive — mirrors PHP CRC32_OVERFLOW constant
  if (hash < 0) hash += 0x100000000;
  return hash.toString(36);
};

/** 
 * Intercept form submission via `gform/submission/pre_submission` 
 * - computes a hash and write it to the .hashMarker hidden input
 * - blocks submission until hash is set.
 * @returns void - but modifies form data before submission
 */
const controlFormSubmission = () => {
  console.debug("Initializing form submission control");
  const gformsReady = emfnWindow.gform && emfnWindow.gform.utils;
  if (!gformsReady || typeof gformsReady.addAsyncFilter !== "function") {
    console.warn("Gravity Forms submission hooks are not ready.");
    return;
  }

  if (isSubmissionHookBound) {
    return;
  }

  gformsReady.addAsyncFilter("gform/submission/pre_submission",
    /** @param {GFormSubmissionStartedData} data */ 
    async (data) => {

    // Only hash real `submit` actions, not next/previous/save-continue actions.
    const submitType = emfnWindow.gform?.submission?.SUBMISSION_TYPE_SUBMIT;
    if (submitType && data.submissionType !== submitType) return data;
    if (!data.form || !data.form.matches(gravityForm)) return data;

    // resolve hash marker early so we can exclude it from the computed hash payload
    const hashMarker = data.form.querySelector("input.hashMarker");
    const hashMarkerName = hashMarker?.getAttribute("name") ?? null;

    // collect all GF input_ fields from the live form element
    console.debug(...new FormData(data.form).entries());
    const entries = [...new FormData(data.form).entries()]
      .filter(([key]) => {
        if (!(key.startsWith("input_") || key.startsWith("choice_"))) return false;
        if (hashMarkerName && key === hashMarkerName) return false;
        return true;
      })
      .sort(([a], [b]) => a.localeCompare(b));
    console.debug("Collected form entries for hashing:", entries);

    const dataString = entries.map(([k, v]) => `${k}:${v}`).join("|");
    console.debug("Form data string for hashing:", dataString);
    const hash = hashFormData(dataString);
    console.debug("Computed form data hash:", hash);

    // write hash into the hidden .hashMarker field so GF saves it
    console.log("Found hash marker input:", hashMarker);
    if (hashMarker) {
      hashMarker.value = hash;
      console.debug("actionPack hash set:", hash);
    } else {
      console.warn("No hash marker input found; writing actionPack URL param only.");
    }
    
    // Also mirror hash to the page URL as actionPack=<hash> for downstream use.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("actionPack", hash);
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      console.debug("actionPack URL param set:", hash);
    } catch (err) {
      console.warn("Failed to set actionPack URL param:", err);
    }

    data.abort = true; // temporary, leave in place until testing is complete
    return data;
  });

  isSubmissionHookBound = true;
};

/* ********* GEOLOCATION ***********/

/** @type {LocationData} Our extracted Google Places v2 data */
const locData = {
  county: null, 
  state: null,
  st: null, 
  country: null,
  fips: null,  
  nri: null,
};

// notebooks/US_disaster_risk_analysis.ipynb-connected constants
// risk level threshold for suggested disasters 
const riskThreshold = 50;
// Base URL for fetching NRI risk CSVs (generated by notebooks/disaster_risk_analysis.ipynb)
/** @type {EmfnData} */
const { dataUrl } = emfnWindow.emfnData || { dataUrl: null };

// prevent duplicate bindings on gform/post_render
let isGeoFeaturesActivated = false;

/**
 * Fetch and parse a per-state NRI risk CSV (generated by notebooks/disaster_risk_analysis.ipynb)
 * @param {string} st - Two-letter state abbreviation (e.g. "GA")
 * @param {string} countyFIPS - 5-digit county FIPS code
 * @returns {Promise<void>} - sets locData.nri for later use in risk mapping
 */
const fetchNriData = async (st, countyFIPS) => {
  if (!countyFIPS || !st) {
    console.error("Missing state abbreviation or county FIPS; cannot fetch NRI data.");
    return;
  }

  // fetch {st}.csv
  /** @type {string|null} */
  let csvData = null;
  try {
    const res = await fetch(`${dataUrl.replace(/\/$/, "")}/${st}.csv`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    csvData = await res.text();
    if (!csvData) throw new Error("Empty CSV response");
  } catch (err) {
    console.error(`Invalid ${st}.csv:`, err);
    // fall back to stub data for local testing (window.emfnData not yet available pre-deploy)
    csvData = "county_fips,state,county,AVLN_risk_score,CFLD_risk_score,CWAV_risk_score,DRGT_risk_score,ERQK_risk_score,HAIL_risk_score,HWAV_risk_score,HRCN_risk_score,ISTM_risk_score,LNDS_risk_score,LTNG_risk_score,IFLD_risk_score,SWND_risk_score,TRND_risk_score,TSUN_risk_score,VLCN_risk_score,WFIR_risk_score,WNTW_risk_score\n01001,Alabama,Autauga,,,25.512230506700917,0.000000000000000,32.908803348673494,49.671197364822277,69.697078030411362,58.263742443413470,28.304525779570682,77.766282568109119,75.751846170311438,30.111899920326309,53.173272448360741,57.914451856872752,,,57.242576671066558,18.941334890427449";
  }

  // parse CSV and find row matching county FIPS
  const [hed, ...lines] = csvData.trim().split("\n");
  const heds = hed.split(",");
  const fipsIndex = heds.findIndex((h) => h.trim() === "county_fips");
  const matchedLine = lines.find((line) => line.split(",")[fipsIndex]?.trim() === countyFIPS);
  /** @type {NriCountyRow|null} */
  const countyMatch = matchedLine
    ? Object.fromEntries(heds.map((h, i) => [h.trim(), matchedLine.split(",")[i]?.trim() ?? ""]))
    : null;
  console.debug(`County line match for ${countyFIPS}`, countyMatch);

  if (countyMatch) { 
    locData.nri = countyMatch;
  } else {
    console.warn(`NRI data: county FIPS ${countyFIPS} not found in ${st}.csv`);
  }
};

/** 
 * resolve county FIPS via FCC Area API using lat/lng from Places v2
 * @param {LatLngLike} location - Google Places v2 location object
 * @returns {Promise<void>} - sets locData.fips and locData.st for later use in risk mapping
 */
const getFipsFromFCC = async (location) => {
  const lat = location.lat() ?? null;
  const lng = location.lng() ?? null;
  if (lat === null || lng === null) {
    console.error("Missing lat/lng from place location");
    return;
  }

  try {
    const fipsRes = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`
    );
    /** @type {FccLookupResponse} */
    const fipsData = await fipsRes.json();

    // set FIPS and state abbreviation (st) in locData for later use in risk mapping
    locData.fips = fipsData?.County?.FIPS ?? null;
    locData.st = fipsData?.State?.code ?? null;
  } catch (err) {
    console.error("FCC FIPS lookup failed:", err);
  }
};

/**
 * bind to Gravity Forms geolocation response and parse its response
 * - resolve county FIPS code via FCC API
 * @returns void - hand to various services
 */
const initializeGeoFeatures = async () => {
  if (isGeoFeaturesActivated) return; // prevent multiple activations

  /** @type {GFormElement | null} */
  const geoInput = /** @type {GFormElement | null} */ (document.querySelector(gravityGeoInput));
  if (!geoInput) {
    console.warn("Geolocation-enabled input not found; skipping geolocation features.");
    return;
  }

  // packaged: bind to Places v2 autocomplete response, resolve location data and map to risks
  const buildOnAutocompleteEvent = () => {
    /** @type {GFormCustomElement | null} */
    const autocompleteEl = /** @type {GFormCustomElement | null} */ (geoInput.querySelector("gmp-place-autocomplete"));
    if (!autocompleteEl || autocompleteEl.dataset.placeBound === "1") return;

    autocompleteEl.addEventListener("gmp-select", async (event) => {
      const { placePrediction } = /** @type {GmpSelectEvent} */ (/** @type {unknown} */ (event));

      /** @type {PlaceLike} */
      const place = placePrediction.toPlace();
      await place.fetchFields({ 
        fields: [
          "addressComponents", 
          "displayName", 
          "formattedAddress",
          "location"
        ] 
      });
      
      if (!place || !place.location || !place.addressComponents) {
        console.warn("Places v2 failed to return a location or address components");
        return;
      }

      // reduce Places v2 to better shape for risk mapping
      /** @type {Object.<string, string>} */
      const addr = (place.addressComponents ?? []).reduce(
        /** @param {Object.<string, string>} acc */
        (acc, { types = [], longText, shortText }) => {
          types.forEach((type) => {
            acc[type] = longText;
            acc[`${type}_short`] = shortText;
          });
          return acc;
        }, /** @type {Object.<string, string>} */ ({})
      );

      // populate locData with resolved Places v2 data
      locData.county = addr.administrative_area_level_2 ?? null;
      locData.state = addr.administrative_area_level_1 ?? null;
      locData.country = addr.country ?? null;
      if (!locData.st && addr.administrative_area_level_1_short) { 
        locData.st = addr.administrative_area_level_1_short;
      }
      
      // try to populate county FIPS
      await getFipsFromFCC(place.location);

      // hand off populated locData to risk population
      await mapLocationToRisks(locData);
    });

    autocompleteEl.dataset.placeBound = "1";
  };
  buildOnAutocompleteEvent();
  document.addEventListener("gform/post_render", buildOnAutocompleteEvent);
  isGeoFeaturesActivated = true;
};

/**
 * Populate user-facing Risks section with geolocation + NRI data 
 * @param {LocationData} place - location data from the Google Places v2 + FCC
 * @returns void
 */
const mapLocationToRisks = async (place) => {
  const risks = document.getElementById("risks");
  const risksTemplate = document.getElementById("risk-template");
  const riskExplainer = document.getElementById("risk-explainer");
  // NRI hazard codes => human-friendly terms
  /** @type {Object.<string, string>} */
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

  if (!place || !risks || !risksTemplate || !riskExplainer) {
    console.error("Required elements for mapping location to risks not found.");
    return;
  }

  // clear previous explainer text
  if (riskExplainer) riskExplainer.innerHTML = "";

  // human error-messaging helper
  const missingData = () => {
    riskExplainer.textContent = [
      "Unable to determine specific risks for your location.", 
      "Please try a broader location (e.g. just city or state)."
    ].join(" ");
  };

  if (!place.fips) {
    console.error("No County FIPS code available");
    missingData();
    return;
  }

  // clear previous rendered risks before appending new ones
  Array.from(risks.children).forEach((child) => {
    if (["risk-explainer", "risk-template"].includes(child.id)) return;
    child.remove();
  });

  // clone template and populate with location and risk data
  /** @type {HTMLElement} */
  const riskEl = /** @type {HTMLElement} */ (risksTemplate.cloneNode(true));
  riskEl.removeAttribute("id");
  const riskItem = riskEl.querySelector(".location");
  const riskRegion = riskEl.querySelector(".region");
  const riskType = riskEl.querySelector(".list");

  if (!riskType) {
    console.error("Risk list element (.list) not found in risk template.");
    return;
  }

  // populate what we can from Places v2 data while we fetch NRI data
  if (riskItem) riskItem.textContent = place.county ?? "Unknown Location";
  if (riskRegion) riskRegion.textContent = place.state ?? "Unknown State";
  riskEl.classList.remove("is-hidden");
  riskEl.classList.add("is-visible");
  risks.appendChild(riskEl);

  // use fips and st to get NRI risk 
  if (!locData.st || !locData.fips) {
    missingData();
    return;
  }

  await fetchNriData(locData.st, locData.fips);
  if (!place.nri) {
    console.error("No NRI data available for FIPS", place.fips);
    missingData();
    return;
  } else {
    console.debug("NRI hazard risk scores for FIPS", place.nri);
  }

  // derive likely hazards from NRI risk scores in the county CSV row
  const likelyHazards = Object.entries(place.nri)
    .filter(([key, val]) => key.endsWith("_risk_score") && parseFloat(val) >= riskThreshold)
    .map(([key, val]) => [NRI_HAZARD_LABELS[key.replace("_risk_score", "").toLowerCase()] ?? null, parseFloat(val)])
    .filter(([label]) => label !== null)
    .sort(([, a], [, b]) => b - a)  // sort descending by risk score
    .map(([label, score]) => `${label} (${Math.round(score)}%)`);

  if (!likelyHazards.length) {
    console.debug("No high-risk hazards found for FIPS", place.fips);
  }

  // build user-facing risk list
  const riskList = `FEMA's >=${riskThreshold}% risks: ${likelyHazards.join(", ")}`;
  
  // populate for users
  riskType.textContent = likelyHazards.length
    ? riskList
    : "No high risk for any specific hazards based on our data.";
};

/**
 * Connects the search input to the content area.
 * @returns void - but populates between our search form and the following component
 */
const connectSearchToContent = () => {
  console.debug("Would connect search to Newspack Content Loop");

  const searchInput = document.querySelector(customSearchInput);
  if (!searchInput) {
    console.error("Search input not found.");
    return;
  }
};

/* ********* ALL-PAGES INITIALIZATION ***********/

(function () {
  "use strict";
  console.debug("EMFN Rich Search Plugin loaded", version);

  const currentUrl = window.location.pathname;
  const body = document.querySelector("body");
  if (!body) return;

  // bind to a valid forms lifecycle or otherwise initialize immediately
  if (emfnWindow.gform !== undefined) {
    if (emfnWindow.gform.themeScriptsLoaded) {
      controlFormSubmission();
    } else {
      document.addEventListener(
        "gform/theme/scripts_loaded", 
        controlFormSubmission, 
        { once: true }
      );
    }
  } else {
    controlFormSubmission();
  }
})();