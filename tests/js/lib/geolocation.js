/**
 * Action Pack Geolocation Logic
 *
 * This module contains the core geolocation logic extracted from the WordPress plugin
 * for testing purposes. The logic mirrors the implementation in
 * plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js
 *
 * In production, this code runs within the WordPress plugin context.
 * For testing, we extract it here to enable proper unit testing and coverage tracking.
 */

/**
 * Populate street address field when no street_address component exists.
 * Uses autocomplete attribute to find the street input, with label-based fallback.
 * @param {HTMLElement} formRoot - The root form element
 * @param {object} addr - Parsed address components object
 * @param {object} placePrediction - Place prediction from Google Places autocomplete
 * @param {object} place - Place object from Google Places API
 * @returns {boolean} - True if street input was populated, false otherwise
 */
function populateStreetAddressField(formRoot, addr, placePrediction, place) {
  // Don't populate if street_address component exists - Gravity Forms handles it
  if (addr.street_address) {
    return false;
  }

  // Use GravityForms custom classes and autocomplete attribute to reliably find street input
  // .location = fieldset wrapper (data-js='geolocation-enabled')
  // .address_line_1 = GravityForms CSS class for street address field (configurable in form editor)
  let streetInput = /** @type {HTMLInputElement | null} */ (
    formRoot.querySelector(
      ".location .address_line_1 input[type='text'][id*='input'][autocomplete*='street-address']"
    )
  );

  // Fallback: check for label containing "Street Address" if primary selector fails
  if (!streetInput) {
    const labels = Array.from(formRoot.querySelectorAll("label"));
    const streetLabel = labels.find(label => /street\s*address/i.test(label.textContent || ""));
    if (streetLabel) {
      const inputId = streetLabel.getAttribute("for");
      streetInput = inputId
        ? formRoot.querySelector(`#${inputId}`)
        : streetLabel.querySelector("input");
    }
  }

  if (!streetInput) {
    return false;
  }

  // Use the text the user selected from the autocomplete menu
  const selectedText =
    placePrediction?.text?.text || place.formattedAddress || place.displayName || "";
  streetInput.value = selectedText;

  return true;
}

module.exports = {
  populateStreetAddressField,
};
