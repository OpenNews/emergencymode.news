// @ts-check (drives Type checking in modern editors)
// EMFN Site Styles Plugin - client-side behaviors
"use strict";

/**
 * ********** TYPES **********
 * @typedef {import("../../../shared/emfn-types").EmfnWindow} EmfnWindow
 */

const version = "0.0.01"; // debugging versioning
const emfnWindow = /** @type {EmfnWindow} */ (window);

/* ********* INITIALIZATION **********
 * - TK things ot do
 */

const isEMFN = window.location.host.includes("emergencymode");
if (isEMFN) {
  console.info("EMFN Styles JS active", version, emfnWindow);
}
