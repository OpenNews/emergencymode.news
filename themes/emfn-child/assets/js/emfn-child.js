/**
 * EMFN Child Theme – additional scripts
 *
 * Loaded in the footer after all other scripts.
 */

const gravityGeoInput = "article form.prepare-form .location input[type='text']";
const customSearchInput = ".search input[type='text']";
const nominatimMinQueryLength = 3;

// helper to check if a GeolocationCoordinates response is valid
const hasCoords = obj => (
  obj &&
  typeof obj === "object" &&
  Number.isFinite(obj.latitude) &&
  Number.isFinite(obj.longitude)
);

// helper to check if a string is non-empty and non-whitespace
const isValidString = str => typeof str === "string" && str.trim() !== "";

/**
 * Attempts to match a location string or geolocation coordinates using the Nominatim API
 * - populates the input with the best match
 * - @TODO lots
 * @see https://nominatim.org/release-docs/develop/api/Search/#language-of-results
 * @returns void - but populates the geolocation input with the user's current location
 */
const tryNominatimMatch = async (locInput, locVal, options = {}) => {
  /**
   * @see https://nominatim.openstreetmap.org/search?q=spring&format=jsonv2&featureType=settlement&limit=40&layer=address&addressdetails=1&dedupe=1&accept-language=en
   * @see https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=52.5487429714954&lon=-1.81602098644987&zoom=15&addressdetails=1&layer=address&&accept-language=en&limit=1
   */
  const queryBase = `&format=jsonv2&featureType=settlement&limit=10&layer=address&addressdetails=1&dedupe=1&accept-language=en`;

  const locationHasCoords = hasCoords(locVal);
  const locationHasQuery = isValidString(locVal);
  if (!locInput || (!locationHasCoords && !locationHasQuery)) return;

  // presume county/region text, but geolocation API may provide lat/lot (optimize for it)
  let query = "";
  if (locationHasCoords) {
    const { latitude, longitude } = locVal;
    query = `reverse?lat=${latitude}&lon=${longitude}&zoom=15`;
  } else {
    query = `search?q=${encodeURIComponent(String(locVal).trim())}`;
  }

  // todo detect user language and set accept-language accordingly
  // or allow it to be passed as an option to the listener

  const { signal } = options;
  let data = null;
  let params = queryBase;
  const url = `https://nominatim.openstreetmap.org/${query}${params}`;
  try {
    const response = await fetch(url, {
      headers: { "Accept-Language": "en" },
      signal,
    });
    const json = await response.json();
    data = Array.isArray(json) ? json : [json];
  } catch (error) {
    if (error?.name === "AbortError") {
      console.debug("Nominatim request aborted for location:", locVal);
      return;
    }
    console.error("Error fetching from Nominatim API:", error);
  }

  switch (true) {
    case !data || data.length === 0:
      console.error("No matches found for location:", locVal);
      break;
    case data && data.length === 1: {
      const bestMatch = data[0];
      setLocationInput(locInput, bestMatch);
      // activate risks 
      console.log("solo risks");
      mapLocationToRisks(locInput, bestMatch.display_name);
      break;
    }
    default:
      populateLocationPicker(data, locInput);
      break;
    }
};

// populate the locInput with the best match
const setLocationInput = (locInput, bestMatch) => {
  if (!bestMatch || !bestMatch.display_name) {
    console.error("Best match does not have a display name:", bestMatch);
    return;
  }
  if (locInput.value === bestMatch.display_name) {
    return;
  }

  locInput.value = bestMatch.display_name;

  // trigger event on injection, so other listeners fire
  locInput.dispatchEvent(new Event("change", { bubbles: true }));
};

const clearContainerChildren = (container, preservedIds = []) => {
  Array.from(container.children).forEach(child => {
    if (preservedIds.includes(child.id)) return;
    child.remove();
  });
};

const populateLocationPicker = (nominatimData, locInput) => {  
  // show user a dropdown of possible matches if there are multiple
  if (nominatimData.length > 1) {
    const matches = document.getElementById("matches");
    const matchesTemplate = document.getElementById("match-template");

    if (!matches || !matchesTemplate) {
      console.error("Match template or container not found in DOM.");
      return;
    }

    // clear previous rendered matches, but preserve the source template if it lives in the container
    clearContainerChildren(matches, ["match-template"]);

    nominatimData.forEach(match => {
      const matchItem = matchesTemplate.cloneNode(true);
      const anchor = matchItem.querySelector("a");
      matchItem.removeAttribute("id");
      matchItem.classList.remove("is-hidden");
      matchItem.classList.add("is-visible");
      anchor.textContent = match.display_name;
      matches.appendChild(matchItem);

      anchor.addEventListener("click", () => {
        setLocationInput(locInput, match);
          clearContainerChildren(matches, ["match-template"]); // clear matches after selection
        matches.classList.remove("is-visible");
        matches.classList.add("is-hidden"); // hide matches container after selection

        // activate risks on selection
        // mapLocationToRisks(locInput, match.display_name);
      });
    });

    matches.classList.add("is-visible");
    matches.classList.remove("is-hidden");
  }
};

/**
 * Try asking browser then fallback to Nominatim for geolocation matches as user types. 
 * - Once there's a location, looks fo location's relative risk at a county level
 * - Surfaces risks in the UI (TBD)
 * @returns void - but populates the geolocation input with the user's current location
 */
const activateGeoFeatures = async () => {
  const locInput = document.querySelector(gravityGeoInput);
  if (!locInput) {
    console.error("Geolocation input not found.");
    return;
  }

  /**
   * generate an named debounced listener on locInput, with callback
   * @param {string} name - name of newly attached listener
   * @param {function} callback - function to call with locInput & loc after `wait`
   * @param {number} wait - ms debouncing (default 500)
   * @returns void - but will execute callback
   */
  const newInputListener = (name, callback, wait = 500) => {
    let debounceTimer = null;
    let activeRequestController = null;
    return {
      name,
      handler: event => {
        if (event?.isComposing) return;
        const val = event?.target?.value?.trim();
        if (!val) return;
        if (val.length < nominatimMinQueryLength) return;
        clearTimeout(debounceTimer);
        if (activeRequestController) {
          activeRequestController.abort();
          activeRequestController = null;
        }
        debounceTimer = setTimeout(async () => {
          if (typeof callback === "function") {
            activeRequestController = new AbortController();
            try {
              await callback(locInput, val, { signal: activeRequestController.signal });
            } finally {
              activeRequestController = null;
            }
          }
        }, wait);
      },
      commitHandler: async event => {
        const val = event?.target?.value?.trim();
        if (!val) return;
        if (val.length < nominatimMinQueryLength) return;
        clearTimeout(debounceTimer);
        if (activeRequestController) {
          activeRequestController.abort();
          activeRequestController = null;
        }
        if (typeof callback === "function") {
          activeRequestController = new AbortController();
          try {
            await callback(locInput, val, { signal: activeRequestController.signal });
          } finally {
            activeRequestController = null;
          }
        }
      },
    };
  };

  // expose listener registration for other functions to use
  const registerListener = listener => {
    locInput.addEventListener("input", listener.handler);
    locInput.addEventListener("change", listener.commitHandler);
  };

  // always support manual location entry
  const nominatimWatcher = newInputListener("nominatimWatcher", tryNominatimMatch);
  registerListener(nominatimWatcher);

  // attempt to geolocate the user via the browser API (polite ask)
  if (navigator.geolocation) {
    try {
      const navGeoData = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          position => resolve(position.coords),
          error => reject(error)
        );
      });
      if (hasCoords(navGeoData))  await tryNominatimMatch(locInput, navGeoData);
    } catch (_error) {
      // no-op
      // console.warn("Browser geolocation allowed but failed:", error);
    }
  }
};

/** 
 * Mock function to demonstrate mapping a location to risks
 * - TODO: actual API
 * @param {HTMLInputElement} geolocInput - the input element where the location is entered
 * @param {string} location - the raw string from the input field, to be matched against a geolocation API
 * @returns void - but populates the geolocation input with the user's current location
 */
const mapLocationToRisks = async (geolocInput, loc) => {
  console.info("Calculating risks based on location");
  const risks = document.getElementById("risks");
  const risksTemplate = document.getElementById("risk-template");

  if (!geolocInput || !loc || !risks || !risksTemplate) {
    console.error("Required elements for mapping location to risks not found.");
    return;
  }

  // Mocked response based on the input location
  const mockedResponse = {
    municipality: loc,
    region: "Earth 2064",
    suggestedDisasters: ["Flood", "Wildfire", "Hurricane", "Tornado", "Earthquake", "Blizzard"],
    confidence: 0.8,
  };

  // show user the risks for their location
  // populate risk template and show
  if (mockedResponse && mockedResponse.suggestedDisasters) {
    // hide risk-explainer
    const riskExplainer = document.getElementById("risk-explainer");
    if (riskExplainer) {
      riskExplainer.innerHTML = "";
    }

    // clear previous risks
    // clear previous rendered risks, but preserve source markup in the container
    clearContainerChildren(risks, ["risk-explainer", "risk-template"]);
    const riskEl = risksTemplate.cloneNode(true);
    riskEl.removeAttribute("id");
    const riskItem = riskEl.querySelector(".municipality");
    const riskRegion = riskEl.querySelector(".region");
    const riskType = riskEl.querySelector(".list");
    if (riskItem) riskItem.textContent = mockedResponse.municipality;
    if (riskRegion) riskRegion.textContent = mockedResponse.region;
    if (riskType) riskType.textContent = "Likely risks: " + mockedResponse.suggestedDisasters.join(", ");
    riskEl.classList.remove("is-hidden");
    riskEl.classList.add("is-visible");
    risks.appendChild(riskEl);
  }
};

/**
 * Connects the search input to the content area.
 * @returns void - but populates between our search form and the following component
 */
const connectSearchToContent = () => {
  console.info("Would connect search to Newspack Content Loop");

  const searchInput = document.querySelector(customSearchInput);
  if (!searchInput) {
    console.error("Search input not found.");
    return;
  }
};

(async function () {
  "use strict";

  const currentUrl = window.location.pathname;
  const body = document.querySelector("body");
  if (!body) return;

  const shouldAugment = ["/action/", "/search/"].some(url => currentUrl.includes(url));
  if (!shouldAugment) return;

  /**
   * depending on path, load various behaviors
   *  – e.g. geolocation on article pages, search-content connection on search page
   */
  switch (true) {
    case currentUrl.includes("/action"): {
      await activateGeoFeatures();
      break;
    }
    case currentUrl.includes("/search"):
      connectSearchToContent();
      break;
    default:
      break;
  }
})();
