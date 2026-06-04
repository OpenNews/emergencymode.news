// @ts-check (drives Type checking in modern editors)
// EMFN Site Styles Plugin - site-wide client-side behaviors
"use strict";

/**
 * ********** TYPES **********
 * @typedef {import("../../../shared/emfn-types").EmfnWindow} EmfnWindow
 */

const version = "0.0.01"; // debugging version notes for JS only
const emfnWindow = /** @type {EmfnWindow} */ (window);

/* ********* INITIALIZATION **********
 * - TK site-wide client-side tasks, if any
 */

const isEMFNHost = window.location.host.includes("emergencymode");
const isDebug = new URLSearchParams(window.location.search).get("emfnDebug") === "true";
if (isEMFNHost && isDebug) {
  console.info("EMFN Styles JS active", version, emfnWindow);
}
