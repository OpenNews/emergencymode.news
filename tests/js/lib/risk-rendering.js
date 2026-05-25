/**
 * Risk Rendering Logic
 *
 * This module contains the core risk rendering logic extracted from the WordPress plugin
 * for testing purposes. The logic mirrors the implementation in
 * plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js
 *
 * In production, this code runs within the WordPress plugin context.
 * For testing, we extract it here to enable proper unit testing and coverage tracking.
 */

/**
 * Create risk elements from a template
 * @param {HTMLElement} risks - the root risk section DOM element
 * @param {HTMLElement} risksTemplate - the risk template DOM element
 * @returns {{riskItem: Element | null, riskRegion: Element | null, riskType: Element} | null}
 */
function createRiskElements(risks, risksTemplate) {
  const riskEl = risksTemplate.cloneNode(true);
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
}

/**
 * Populate location fields with actual county and state data
 * @param {Element | null} riskItem - element for county name
 * @param {Element | null} riskRegion - element for state name
 * @param {{county: string | null, state: string | null}} locData - location data
 * @returns {void}
 */
function populateLocationFields(riskItem, riskRegion, locData) {
  if (riskItem) riskItem.textContent = locData.county || "";
  if (riskRegion) riskRegion.textContent = locData.state || "";
}

/**
 * Render fallback risk with location data
 * @param {Element | null} riskItem - element for county name
 * @param {Element | null} riskRegion - element for state name
 * @param {Element} riskType - element for risk message
 * @param {{county: string | null, state: string | null}} locData - location data
 * @returns {void}
 */
function renderFallbackRisk(riskItem, riskRegion, riskType, locData) {
  if (riskItem) riskItem.textContent = locData.county || "Unable to resolve location";
  if (riskRegion) riskRegion.textContent = locData.state || "Location unavailable";
  riskType.textContent =
    "Unable to determine specific risks for your location. Please pick another location in your county or province.";
}

/**
 * Clear rendered risks while preserving template
 * @param {HTMLElement} risks - the root risk section DOM element
 * @returns {void}
 */
function clearRenderedRisks(risks) {
  Array.from(risks.children).forEach(child => {
    if (child.id !== "risk-template") child.remove();
  });
}

/**
 * Render risk list text
 * @param {Element} riskType - the DOM element to populate with risk text
 * @param {string[]} likelyHazards - the list of likely hazards
 * @returns {void}
 */
function renderRiskList(riskType, likelyHazards) {
  riskType.textContent = likelyHazards.length
    ? `FEMA's top hazards: ${likelyHazards.join(", ")}`
    : "No high risk for any specific hazards based on our data.";
}

module.exports = {
  createRiskElements,
  populateLocationFields,
  renderFallbackRisk,
  clearRenderedRisks,
  renderRiskList,
};
