/**
 * EMFN Child Theme – additional scripts
 *
 * Loaded in the footer after all other scripts.
 */

const tryNominatimMatch = async (geolocInput, location) => {
  /**
   * @see https://nominatim.org/release-docs/develop/api/Search/#language-of-results
   * @see https://nominatim.openstreetmap.org/search?q=spring&format=jsonv2&featureType=settlement&limit=40&layer=address&addressdetails=1&dedupe=1&accept-language=en
   */
  const queryBase = `&format=jsonv2&featureType=settlement&limit=10&layer=address&addressdetails=1&dedupe=1&accept-language=en`;

  if (!geolocInput || !location || location.trim() === "") return;

  // presume county/region text, but geolocation API may provide lat/lot (optimize for it)
  let query = `search?q=${encodeURIComponent(location)}`;
  if (typeof location === "object" && Object.keys(location).includes("latitude")) {
    const { latitude, longitude } = location;
    query = `reverse?lat=${latitude}&lon=${longitude}`;
  }

  let data = null;
  let params = queryBase;
  if (usOnly) params += englishMedia;

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/${query}${params}`, {
      headers: { "Accept-Language": "en" },
    });
    data = await response.json();
  } catch (error) {
    console.error("Error fetching from Nominatim API:", error);
  }
  console.debug("Nominatim API response:", data);

  if (data.length === 0) {
    console.warn("No matches found for location:", location);
    return;
  }

  // show user a dropdown of possible matches if there are multiple
  if (data.length > 1) {
    console.info("Multiple matches found for location. Showing dropdown to user.");

    // TODO: implement dropdown UI to let user select from multiple matches
    console.debug("Multiple location matches:", data);
  }

  // populate the geolocInput with the best match (first result)
  const bestMatch = data[0];
  geolocInput.value = bestMatch.display_name;
  console.info("Location matched to:", bestMatch.display_name);

  // insert into form
  geolocInput.value = bestMatch.display_name;

  // trigger event on injection, so other scripts can respond
  geolocInput.dispatchEvent(new Event("input", { bubbles: true }));
};

/**
 * Called within a debounced event-handler on `location` input and hits
 * an API to attempt to match the location string to a known place
 * @param {HTMLInputElement} geolocInput
 * @param {string|object} location - the raw string from the input field, to be matched against a geolocation API, or an object with latitude/longitude from browser geolocation
 * @returns void - but populates the geolocation input with the user's current location
 */
const activateGeoFeatures = async geolocInput => {
  let debounceTimer = null;

  // set debounce on input changes
  const inputListener = callback => {
    geolocInput.addEventListener("input", callback => {
      const location = geolocInput.value.trim();
      if (!location) return;

      clearTimeout(debounceTimer);

      debounceTimer = setTimeout(async () => {
        console.debug("Location input changed:", location);
        if (callback) await callback(geolocInput, location);
      }, 500);
    });
  };
  inputListener(null); // set up the listener without a callback for now

  let browserGeolocated = null;
  try {
    // attempt to geolocate the user via the browser API
    browserGeolocated = navigator.geolocation.getCurrentPosition(position => position.coords);
    console.debug("Browser geolocation result:", browserGeolocated);
    if (
      typeof browserGeolocated === "object" &&
      Object.keys(browserGeolocated).includes("latitude")
    ) {
      await tryNominatimMatch(geolocInput, browserGeolocated);
    }
  } catch (error) {
    // connect tryNominatimMatch to existing geoLocInput handler defined above
    inputListener(tryNominatimMatch);
  }
  // await mapLocationToRisks(geolocInput, location);
  // inputListener(mapLocationToRisks);
};

/**
 * Connects the search input to the content area.
 * @returns void - but populates between our search form and the following component
 */
const connectSearchToContent = () => {
  console.info("Connecting search to content");

  const searchInput = document.querySelector(".search input[type='text']");

  if (!searchInput) {
    console.warn("Search input not found.");
    return;
  }

  searchInput.placeholder = "Search for news by keyword or location";
};

(async function () {
  "use strict";
  console.info("Custom EMFN work loaded");

  const currentUrl = window.location.pathname;
  console.log("Current URL:", currentUrl);
  const body = document.querySelector("body");
  const augmentedURLs = new Set(["/action", "/search"]);

  const shouldAugment = augmentedURLs.some(url => currentUrl.includes(url));

  if (!shouldAugment || !body) return;

  const geolocInput = body
    .querySelector("article form.prepare-form .location input[type='text']")
    .trim();

  switch (true) {
    case geolocInput.length > 0: {
      await activateGeoFeatures(geolocInput);
      break;
    }
    case currentUrl.includes("/search"):
      connectSearchToContent();
      geolocInput.placeholder = "Enter your location to find nearby news";
      break;
    default:
      break;
  }
})();
