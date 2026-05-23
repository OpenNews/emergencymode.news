// @ts-check (drives Type checking in modern editors)
// EMFN Action Pack Plugin - client-side behaviors
"use strict";

/**
 * ********** TYPES **********
 * @typedef {import("../../../shared/emfn-types").EmfnData} EmfnData
 * @typedef {import("../../../shared/emfn-types").EmfnWindow} EmfnWindow
 * @typedef {import("../../../shared/emfn-types").LatLngLike} LatLngLike
 * @typedef {import("../../../shared/emfn-types").NriCountyRow} NriCountyRow
 * @typedef {import("../../../shared/emfn-types").LocationData} LocationData
 * @typedef {import("../../../shared/emfn-types").FccLookupResponse} FccLookupResponse
 * @typedef {import("../../../shared/emfn-types").PlaceLike} PlaceLike
 * @typedef {import("../../../shared/emfn-types").GmpSelectEvent} GmpSelectEvent
 * @typedef {import("../../../shared/emfn-types").GFormSubmissionStartedData} GFormSubmissionStartedData
 */

const version = "0.8.05"; // debugging versioning
const riskThreshold = 85; // threshold for suggested risks
const emfnWindow = /** @type {EmfnWindow} */ (window);

/** @type {EmfnData} - path exposed by plugin */
const { dataUrl, actionPackPayloadPrefix = "ap2." } = emfnWindow.emfnData || {
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
const getGravityForm = () =>
  /** @type {HTMLFormElement | null} */ (document.querySelector(gravityForm));

// in-memory location state for the current quiz session
const locData = /** @type {LocationData} */ ({
  county: null,
  state: null,
  st: null,
  country: null,
  fips: null,
});

// optional verbose debugging via querystring, e.g. ?emfnDebug=true
const emfnDebug = (/** @type {any[]} */ ...args) => {
  const debugParam = new URLSearchParams(window.location.search).get("emfnDebug");
  if ((debugParam || "").trim().toLowerCase() === "true") console.debug(...args);
};

const GeolocationFlow = {
  /** @type {string} */
  gravityGeoInput: `.location[data-js='geolocation-enabled']`,
  /** @type {string} */
  storageKey: "emfn_locData",

  /**
   * Return whether a county/state selection is currently stored in memory or sessionStorage
   * @returns {boolean}
   */
  hasStoredLocation() {
    if (locData.st || locData.fips) return true;

    try {
      return Boolean(sessionStorage.getItem(GeolocationFlow.storageKey));
    } catch (err) {
      console.warn("Unable to read location data from sessionStorage:", err);
      return false;
    }
  },

  /**
   * Clear location "state" before handling a new place selection
   * @returns {void}
   */
  clearSavedLocation() {
    try {
      sessionStorage.removeItem(GeolocationFlow.storageKey);
    } catch (err) {
      console.warn("Unable to clear sessionStorage:", err);
    }
    Object.assign(locData, { county: null, state: null, st: null, country: null, fips: null });
    hasResolvedGeolocation = false;

    // Clear risk rendering state so new selection triggers fresh render
    const formRoot = getGravityForm();
    if (formRoot) {
      const risks = /** @type {HTMLDivElement | null} */ (formRoot.querySelector("#risks"));
      if (risks) {
        RiskRenderer.resetRendering(risks);
        RiskRenderer.clearRenderedRisks(risks);
      }

      // Clear hidden FIPS field to prevent stale data submission if lookup fails
      const fipsField = /** @type {HTMLInputElement | null} */ (
        formRoot.querySelector(fipsFieldSelection)
      );
      if (fipsField) {
        fipsField.value = "";
      }
    }
  },

  /**
   * store locData on sessionStorage as a backup
   * @returns {void}
   */
  persist() {
    try {
      sessionStorage.setItem(GeolocationFlow.storageKey, JSON.stringify({ ...locData }));
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
      const storedLocData = sessionStorage.getItem(GeolocationFlow.storageKey);
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
      fields: ["addressComponents", "displayName", "formattedAddress", "location"],
    });

    if (!place || !place.location || !place.addressComponents) {
      console.error("Places v2 missing address components or location data");
      return;
    }

    const addr = (place.addressComponents ?? []).reduce(
      /** @param {Object.<string, string>} acc */
      (acc, { types = [], longText, shortText }) => {
        types.forEach(type => {
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

    // set the resolved FIPS code into the hidden form field for submission
    const fipsField = /** @type {HTMLInputElement | null} */ (
      formRoot.querySelector(fipsFieldSelection)
    );
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
   * @param {HTMLElement} geoInput - DOM for geolocation input and autocomplete
   * @returns {void}
   */
  bindPlaceSelection(geoInput) {
    /** @type {HTMLElement | null} */
    const autocompleteEl = /** @type {HTMLElement | null} */ (
      geoInput.querySelector("gmp-place-autocomplete")
    );
    if (!autocompleteEl || autocompleteEl.dataset.placeBound === "1") return;

    autocompleteEl.addEventListener("gmp-select", async event => {
      try {
        GeolocationFlow.clearSavedLocation();
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
    const fipsIndex = heds.findIndex(h => h.trim() === "county_fips");
    const matchedLine = lines.find(line => line.split(",")[fipsIndex]?.trim() === countyFIPS);

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
    const hasCachedCountyData =
      RiskRenderer.lastFetchedCountyState === st &&
      RiskRenderer.lastFetchedCountyFips === countyFIPS &&
      RiskRenderer.lastFetchedNriData !== null;

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
    Array.from(risks.children).forEach(child => {
      if (child.id !== "risk-template") child.remove();
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
    if (!fallbackElements) return;

    const { riskItem, riskRegion, riskType } = fallbackElements;
    if (riskItem) riskItem.textContent = locData.county || "Unable to resolve location";
    if (riskRegion) riskRegion.textContent = locData.state || "Location unavailable";
    riskType.textContent =
      "Unable to determine specific risks for your location. Please pick another location in your county or province.";
  },

  /**
   * Build the ranked hazard labels from one county row
   * @param {NriCountyRow} nriData - the county risk data
   * @returns {string[]} - ranked hazards with risk percentages (e.g. "Hurricane (80%)")
   */
  deriveLikelyHazards(nriData) {
    const allHazardScores = Object.entries(nriData)
      .filter(([key]) => key.endsWith("_risk_score"))
      .map(([key, val]) => {
        const hazardKey = key.replace("_risk_score", "").toLowerCase();
        const label = RiskRenderer.hazardLabels[hazardKey];
        const score = parseFloat(val);
        return /** @type {[string, number]} */ ([label, score]);
      })
      .filter(([label, score]) => label && !isNaN(score))
      .sort(([, a], [, b]) => b - a);

    const highRiskHazards = allHazardScores.filter(([, score]) => score >= riskThreshold);
    const likelyHazardScores =
      highRiskHazards.length > 0 ? highRiskHazards : allHazardScores.slice(0, 3);

    return likelyHazardScores.map(([label, score]) => `${label} (${Math.round(score)}%)`);
  },

  /**
   * Resolve state and county FIPS from in-memory state and the scoped form fields
   * @returns {{ resolvedFips: string, resolvedSt: string } | null}
   */
  getResolvedLocation() {
    if (locData.fips && locData.st) {
      return { resolvedFips: locData.fips, resolvedSt: locData.st };
    }

    const formRoot = getGravityForm();
    if (!formRoot) return null;

    const fipsField = /** @type {HTMLInputElement | null} */ (
      formRoot.querySelector(fipsFieldSelection)
    );
    const resolvedFips = fipsField?.value ?? locData.fips ?? null;
    const resolvedSt = locData.st;

    if (!resolvedFips || !resolvedSt) return null;

    locData.fips = resolvedFips;
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
   *   riskType: Element
   * } | null} - the key DOM elements to populate with risk data
   */
  createRiskElements(risks, risksTemplate) {
    const riskEl = /** @type {HTMLElement} */ (risksTemplate.cloneNode(true));
    riskEl.removeAttribute("id");
    riskEl.classList.remove("is-hidden");
    riskEl.classList.add("is-visible");
    risks.appendChild(riskEl);

    const riskItem = riskEl.querySelector(".location");
    const riskRegion = riskEl.querySelector(".region");
    const riskType = riskEl.querySelector(".list");

    if (!riskType) {
      console.error("Risk .list DOM not found in risk template.");
      return null;
    }

    return { riskItem, riskRegion, riskType };
  },

  /**
   * Populate the user-facing risk list text
   * @param {Element} riskType - the DOM element to populate with risk text
   * @param {string[]} likelyHazards - the list of likely hazards
   * @returns {void} - populates the riskType element for users
   */
  renderRiskList(riskType, likelyHazards) {
    riskType.textContent = likelyHazards.length
      ? `FEMA's top hazards: ${likelyHazards.join(", ")}`
      : "No high risk for any specific hazards based on our data.";
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

    const risks = /** @type {HTMLDivElement | null} */ (formRoot.querySelector("#risks"));
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
  /**
   * Custom types for the Action Pack tallCategories.csv "registry"
   * @typedef {Object} HashedCategory
   * @property {string} category
   * @property {number} manual_rank - Internal snake_case storage from CSV's manualRank column
   * @property {number} cat_id - Category ID from CSV's catID column
   * @typedef {Object} MatchedCategory
   * @property {string} category - name of the category in WP's database
   * @property {number} count - count of tokens matched for this category
   * @property {number} manualRank - rank for this answer + category
   * @property {number} catId - Category ID for encoding
   * @typedef {Object} HashSet
   * @property {Object.<string, HashedCategory[]>} registry
   * @property {Map<string, number>} categoryRanks
   * @property {Map<string, number>} categoryIds
   * @property {string[]} categoryOrder
   * @property {number[]} categoryIdOrder
   */

  /** @type {string[]} */
  actionPackCategoryOrder: [],

  /** @type {number[]} */
  actionPackCategoryIdOrder: [],

  /** @type {Object.<string, HashedCategory[]>} */
  actionPackCategoryRegistry: {},

  /**
   * Load Action Pack category mapping and rank order from `_tallCategories.csv`
   * @returns {Promise<void>}
   */
  async getCategoriesFromLatestCSV() {
    if (!dataUrl) {
      console.error("_tallCategories.csv failed");
      return;
    }
    const csvUrl = `${dataUrl.replace(/\/$/, "")}/_tallCategories.csv`;

    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${csvUrl}`);

      const csvText = await res.text();
      if (!csvText.trim()) throw new Error("Empty CSV response");

      const lines = csvText.trim().split(/\r?\n/);
      const header = (lines[0] ?? "").split(",").map(value => value.trim().toLowerCase());

      // validate required columns and get their indices
      const answerIdIndex = header.indexOf("answerid");
      const categoryIndex = header.indexOf("category");
      const manualRankIndex = header.indexOf("manualrank");
      const catIdIndex = header.indexOf("catid");
      if (
        answerIdIndex === -1 ||
        categoryIndex === -1 ||
        manualRankIndex === -1 ||
        catIdIndex === -1
      ) {
        throw new Error(
          [
            `CSV header missing required columns: [answerID, category, manualRank, catID].`,
            `Found: ${header.join(", ")}`,
          ].join(" ")
        );
      }

      // build and order the registry of answerID <> Category & manualRank & catID
      const { registry, categoryRanks, categoryOrder, categoryIds } = lines.slice(1).reduce(
        (acc, line) => {
          if (!line.trim()) return acc;

          const columns = line.split(",");
          const answerId = columns[answerIdIndex]?.trim();
          const categoryName = columns[categoryIndex]?.trim();
          const manualRank = Number(columns[manualRankIndex]?.trim());
          const catId = Number(columns[catIdIndex]?.trim());

          if (!answerId || !categoryName || !catId) return acc;

          // keep one entry per answer/category pair with the highest rank seen
          const answerEntries = acc.registry[answerId] ?? (acc.registry[answerId] = []);
          const existingEntry = answerEntries.find(entry => entry.category === categoryName);

          if (existingEntry) {
            existingEntry.manual_rank = Math.max(existingEntry.manual_rank, manualRank);
          } else {
            answerEntries.push({ category: categoryName, manual_rank: manualRank, cat_id: catId });
          }

          // keep a first-seen category order then upgrade its rank as needed
          if (!acc.categoryRanks.has(categoryName)) {
            acc.categoryOrder.push(categoryName);
            acc.categoryIds.set(categoryName, catId);
            acc.categoryRanks.set(categoryName, manualRank);
            return acc;
          }

          acc.categoryRanks.set(
            categoryName,
            Math.max(acc.categoryRanks.get(categoryName) ?? 0, manualRank)
          );
          return acc;
        },
        /** @type {HashSet} */ ({
          registry: {},
          categoryRanks: new Map(),
          categoryIds: new Map(),
          categoryOrder: [],
          categoryIdOrder: [],
        })
      );

      // safety: sort each answer's categories by manual rank descending
      Object.values(registry).forEach(entries => {
        entries.sort((left, right) => right.manual_rank - left.manual_rank);
      });

      // re-sort the order by manual rank descending with first-seen tiebreaker
      SubmissionHashing.actionPackCategoryRegistry = registry;
      SubmissionHashing.actionPackCategoryOrder = categoryOrder.sort((left, right) => {
        return (categoryRanks.get(right) ?? 0) - (categoryRanks.get(left) ?? 0);
      });

      // build the parallel catID order array
      SubmissionHashing.actionPackCategoryIdOrder = SubmissionHashing.actionPackCategoryOrder.map(
        categoryName => categoryIds.get(categoryName) ?? 0
      );
    } catch (err) {
      console.warn("Unable to load Action Pack categories from CSV", err);
    }
  },

  /**
   * Resolve the canonical Action Pack category order.
   * @returns {string[]}
   */
  getActionPackCategoryOrder() {
    return SubmissionHashing.actionPackCategoryOrder;
  },

  /**
   * Resolve ranked category matches for selected tokens.
   * @param {string[]} selectedTokens - selected semantic values from the quiz
   * @returns {MatchedCategory[]}
   */
  resolveMatchedCategories(selectedTokens) {
    /** @type {Map<string, MatchedCategory>} */
    const matchedCategoriesByName = new Map();

    selectedTokens.forEach(token => {
      const categoryEntries = SubmissionHashing.actionPackCategoryRegistry[token] ?? [];

      categoryEntries.forEach(entry => {
        const categoryName = entry.category.trim();
        const manualRank = entry.manual_rank;
        const catId = entry.cat_id;
        if (!categoryName || !catId) return;

        const existingMatch = matchedCategoriesByName.get(categoryName);
        if (!existingMatch) {
          matchedCategoriesByName.set(categoryName, {
            category: categoryName,
            count: 1,
            manualRank,
            catId,
          });
          return;
        }

        existingMatch.count += 1;
        existingMatch.manualRank = Math.max(existingMatch.manualRank, manualRank);
      });
    });

    return Array.from(matchedCategoriesByName.values()).sort(
      (left, right) => right.manualRank - left.manualRank
    );
  },

  /**
   * Reorder selected categories into the canonical bit order used for payload encoding
   * @param {MatchedCategory[]} matchedCategories - selected categories with duplicate counts
   * @returns {MatchedCategory[]}
   */
  getCanonicalPackedCategories(matchedCategories) {
    const matchedCategoriesByName = new Map(
      matchedCategories.map(categoryMatch => [categoryMatch.category, categoryMatch])
    );

    return SubmissionHashing.getActionPackCategoryOrder()
      .map(categoryName => matchedCategoriesByName.get(categoryName) ?? null)
      .filter(categoryMatch => categoryMatch !== null);
  },

  /**
   * Format matched categories for debug output with their pre-dedupe counts and catIDs.
   * @param {MatchedCategory[]} matchedCategories - selected categories with duplicate counts
   * @returns {string[]}
   */
  formatPackedCategoriesForDebug(matchedCategories) {
    return matchedCategories.map(
      ({ category, count, catId }) => `${category} (${count}) [catID: ${catId}]`
    );
  },

  /**
   * Schedule submission binding exactly once across all startup states
   * @returns {void}
   */
  initializeSubmissionHandling() {
    if (hasInitializedSubmissionBinding) return;

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
   * Pack canonical Action Pack category IDs into compact 31-bit segments.
   * @param {number[]} catIds - unique category IDs to encode
   * @returns {number[]}
   */
  packActionPackBits(catIds) {
    const packedSegments = []; // use an array to avoid JS bitwise math pitfalls
    const segmentSize = 31;
    const orderedCatIds = SubmissionHashing.actionPackCategoryIdOrder;
    const catIdIndex = new Map(orderedCatIds.map((catId, index) => [catId, index]));

    for (const catId of catIds) {
      const bitPosition = catIdIndex.get(catId);
      if (bitPosition === undefined) {
        continue;
      }

      // each segment stores 31 token flags so JS bitwise math stays predictable
      const segmentIndex = Math.floor(bitPosition / segmentSize);
      const bitIndex = bitPosition % segmentSize;

      // build up segments
      while (packedSegments.length <= segmentIndex) {
        packedSegments.push(0);
      }

      // turn on the bit for this catID inside its segment.
      packedSegments[segmentIndex] |= 1 << bitIndex;
    }

    if (packedSegments.length === 0) packedSegments.push(0);
    return packedSegments;
  },

  /**
   * Collect selected semantic submission values from `fieldset.hashable` controls.
   * @param {HTMLFormElement} form - the active Gravity Form element
   * @returns {string[]}
   */
  collectHashableValues(form) {
    const uniqueHashableValues = new Set();

    new FormData(form).forEach((value, name) => {
      const hashableControl = form.querySelector(`fieldset.hashable [name="${CSS.escape(name)}"]`);
      const cleanTxt = String(value).trim();
      if (hashableControl && cleanTxt) uniqueHashableValues.add(cleanTxt);
    });

    return Array.from(uniqueHashableValues);
  },

  /**
   * Intercept form submission and writes hashed submission values to .hashMarker input
   * @returns {void}
   */
  controlFormSubmission() {
    if (hasBoundSubmissionFilter) {
      console.warn("Submission filter already bound; skipping duplicate binding");
      return;
    }

    // block form submission until hash is set to hidden form field
    const gformsReady = emfnWindow.gform?.utils;
    if (!gformsReady?.addAsyncFilter) {
      console.error("Gravity Forms utils not available; Action Pack payload encoding disabled.");
      return;
    }

    gformsReady.addAsyncFilter("gform/submission/pre_submission", async data => {
      // only run on final submit, not form pagination or other submission types
      const submitType = emfnWindow.gform?.submission?.SUBMISSION_TYPE_SUBMIT;
      if (submitType && data.submissionType !== submitType) return data;

      // ignore any non-ActionPack gravity form instances
      if (!data.form || !data.form.matches(gravityForm)) return data;

      await SubmissionHashing.getCategoriesFromLatestCSV();

      // set the encoded payload to the hidden .hashMarker input
      const hashMarkerField = /** @type {HTMLInputElement | null} */ (
        data.form.querySelector(".hashMarker input")
      );
      if (!hashMarkerField) {
        console.error(".hashMarker not found, unable to store Action Pack payload");
        return data;
      }

      const orderedCategories = SubmissionHashing.getActionPackCategoryOrder();
      if (orderedCategories.length === 0) {
        emfnDebug("Action Pack category order is empty so payload encoding was skipped");
        hashMarkerField.value = "";
        return data;
      }

      // select the `.hashable`-marked values from current form content
      const hashableValues = SubmissionHashing.collectHashableValues(data.form);
      emfnDebug(`.hashable form values:`, hashableValues);
      const matchedCategories = SubmissionHashing.resolveMatchedCategories(hashableValues);
      if (matchedCategories.length === 0) {
        emfnDebug("No Action Pack categories resolved so payload encoding was skipped");
        hashMarkerField.value = "";
        return data;
      }

      const packedCategories = SubmissionHashing.getCanonicalPackedCategories(matchedCategories);

      // pack the canonicalized category IDs into compact bit segments
      const bits = SubmissionHashing.packActionPackBits(
        packedCategories.map(categoryMatch => categoryMatch.catId)
      );
      const packedCategoryLabels =
        SubmissionHashing.formatPackedCategoriesForDebug(packedCategories);
      emfnDebug(`Encoded Action Pack categories:`, packedCategoryLabels);

      const base36Segs = bits.map(segment => segment.toString(36)).join(".");
      hashMarkerField.value = `${actionPackPayloadPrefix}${base36Segs}`;

      // data.abort = true; // DEBUGGING uncomment to block submission
      return data;
    });

    hasBoundSubmissionFilter = true;
    return;
  },
};

/* ********* INITIALIZATION **********
 * - bind to Gravity Forms submission event to create hashes
 * - bind to Places v2 autocomplete selection for geolocation and risk mapping
 * - both have guards to prevent duplicate bindings in case of multiple form renders
 *   or script load events
 */

/** Run if there's an assessment section, form, or a `?mode=` param (NOT on results page)
 * @type {HTMLElement | null}
 */
const assessmentSection = document.querySelector("section.assessment");
const hasForm = !!document.querySelector(gravityForm);
const hasModeParam = (new URLSearchParams(window.location.search).get("mode") ?? "").trim() !== "";

if (assessmentSection || hasForm || hasModeParam) {
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

      const geoInput = /** @type {HTMLElement | null} */ (
        formRoot.querySelector(GeolocationFlow.gravityGeoInput)
      );

      if (geoInput) {
        GeolocationFlow.bindPlaceSelection(geoInput);
      }

      if (hasResolvedGeolocation) {
        void RiskRenderer.mapLocationToRisks().catch(error => {
          console.error("Error mapping location to risks:", error);
        });
      }
    });
  }
}
