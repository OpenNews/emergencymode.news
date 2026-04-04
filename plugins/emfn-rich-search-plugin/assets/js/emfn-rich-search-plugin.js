// @ts-check
"use strict";

// EMFN Rich Search Plugin - deconstruct hash to drive search
// - break hash and set Categories from CSV and/or AI-model inference
// - alter direct-sibling Content-Loop component hash-derived rules

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
if (1 === 1) {
  console.debug("EMFN Rich Search Plugin active", version);
}