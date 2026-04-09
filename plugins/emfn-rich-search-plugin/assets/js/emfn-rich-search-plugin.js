// @ts-check
// EMFN Rich Search Plugin - connect custom search to Content Loop logic
"use strict";

/**
 * ********** TYPES **********
 * @typedef {import("../../../shared/emfn-types").EmfnData} EmfnData
 * @typedef {import("../../../shared/emfn-types").EmfnWindow} EmfnWindow
 */

const version = "0.0.01"; // debugging versioning

/** @type {EmfnWindow} */
const emfnWindow = window;
console.debug(`emfnWindow:`, emfnWindow);

/* ********* INITIALIZATION **********
* TK
*/
// if (1 === 1) {
  console.debug("EMFN Rich Search Plugin active", version);
// }