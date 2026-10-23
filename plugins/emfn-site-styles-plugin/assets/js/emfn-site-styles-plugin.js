// @ts-check (drives Type checking in modern editors)
// EMFN Site Styles Plugin - site-wide client-side behaviors
"use strict";

(function () {
  const version = "0.0.04"; // debugging version notes for JS only

  /** @type {import("../../../shared/emfn-types").EmfnNavigator} */
  const nav = navigator; // typed navigator for EMFN purposes
  const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;

  /* ********* INITIALIZATION **********
   * - log that its running, in debug mode
   * - check for lite site conditions (data saver, reduced motion, low battery)
   */

  const isEMFNHost = window.location.host.includes("emergencymode");
  const isDebug = new URLSearchParams(window.location.search).get("emfnDebug") === "true";
  if (isEMFNHost && isDebug) {
    console.info("EMFN Styles JS active", version);
  }

  // OS-level preference; also a coarse CH that the user wants a lighter experience
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)");

  const syncReducedMotionClass = () =>
    document.body.classList.toggle("emfn-reduced-motion", reducedMotion?.matches === true);
  syncReducedMotionClass();
  reducedMotion?.addEventListener("change", syncReducedMotionClass);

  document.body.classList.toggle("emfn-save-data", conn?.saveData === true);

  /**
   * Low battery body class: 20% or lower and not charging. Checked on load, then watched
   * (debounced) only for the first minute. Battery Status API is Chromium only, so
   * feature-detect and fail silently. Debounced and then not checked after initial timeframe.
   * - Possible expansion, NOT implemented: infer iOS Low Power Mode (Safari, no Battery API) by
   *    sampling requestAnimationFrame timing, since Safari throttles it to ~30fps in that
   *    mode. It is a fragile proxy: slow devices, background tabs and heavy pages produce
   *    the same drop, so it would show the lite banner to people who are not low.
   *    Worth revisiting if Safari is important enough to accept false positives.
   * @returns {Promise<void>}
   */
  const checkInitialBattery = async () => {
    if (typeof nav.getBattery !== "function") return;
    const startedAt = Date.now();

    try {
      // Call as a method; a detached getBattery throws "Illegal invocation"
      const battery = await nav.getBattery();
      if (!battery) return;

      const remaining = 60000 - (Date.now() - startedAt);
      if (remaining <= 0) return;

      const syncLowBatteryClass = () => {
        const lowBattery =
          Number.isFinite(battery.level) && battery.level <= 0.2 && battery.charging !== true;
        document.body.classList.toggle("emfn-low-battery", lowBattery);
      };

      /** @type {ReturnType<typeof setTimeout> | undefined} */
      let debounceTimer;
      const onBatteryChange = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(syncLowBatteryClass, 5000);
      };

      battery.addEventListener("levelchange", onBatteryChange);
      battery.addEventListener("chargingchange", onBatteryChange);
      syncLowBatteryClass();

      setTimeout(() => {
        clearTimeout(debounceTimer);
        battery.removeEventListener("levelchange", onBatteryChange);
        battery.removeEventListener("chargingchange", onBatteryChange);
      }, remaining);
    } catch {
      // Blocked by permissions or other issues -- do nothing
    }
  };

  checkInitialBattery();
})();
