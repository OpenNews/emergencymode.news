/**
 * Tests for the production site-styles script, loaded as-is into jsdom.
 * Covers the `emfn-reduced-motion` and `emfn-save-data` body classes, then the lite-site
 * banner toggling.
 */

const fs = require("fs");
const path = require("path");

const SCRIPT = fs.readFileSync(
  path.join(
    __dirname,
    "../../../plugins/emfn-site-styles-plugin/assets/js/emfn-site-styles-plugin.js"
  ),
  "utf8"
);

/**
 * Mock matchMedia with a controllable `matches` and `change` listeners
 * @param {boolean} initial Initial `matches` value
 * @returns {{matches: boolean, set: (value: boolean) => void}} The mock media query list
 */
function mockReducedMotion(initial) {
  const listeners = [];
  const mql = {
    matches: initial,
    addEventListener: (type, fn) => type === "change" && listeners.push(fn),
    set(value) {
      mql.matches = value;
      listeners.forEach(fn => fn());
    },
  };
  window.matchMedia = jest.fn(() => mql);
  return mql;
}

function runScript() {
  window.eval(SCRIPT);
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe("Site Styles Plugin - JS", () => {
  beforeEach(() => {
    document.body.className = "";
    document.body.innerHTML = "";
    delete navigator.getBattery;
    delete navigator.connection;
  });

  // JS adds this class based on the user's reduced motion preference
  describe(".emfn-reduced-motion body class", () => {
    test("added when the user prefers reduced motion", () => {
      mockReducedMotion(true);
      runScript();
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(true);
    });

    test("not added when the user has no preference", () => {
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(false);
    });

    test("applied even when the lite-site banner is absent", () => {
      mockReducedMotion(true);
      expect(document.querySelector(".lite-site-cta")).toBeNull();
      runScript();
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(true);
    });

    test("follows OS setting changes", () => {
      const mql = mockReducedMotion(false);
      runScript();
      mql.set(true);
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(true);
      mql.set(false);
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(false);
    });

    test("does nothing when matchMedia is unavailable", () => {
      window.matchMedia = undefined;
      expect(runScript).not.toThrow();
      expect(document.body.classList.contains("emfn-reduced-motion")).toBe(false);
    });

    test("leaves other body classes alone", () => {
      document.body.classList.add("home");
      mockReducedMotion(true);
      runScript();
      expect(document.body.classList.contains("home")).toBe(true);
    });
  });

  // PHP adds this class from the Save-Data request header; JS adds it from
  // navigator.connection.saveData if the server missed it.
  describe(".emfn-save-data body class", () => {
    const cta = () => document.querySelector(".lite-site-cta");
    const mockConnection = value =>
      Object.defineProperty(navigator, "connection", { value, configurable: true });

    test("kept when the server added it", () => {
      document.body.classList.add("emfn-save-data");
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("added by the script when the server missed it and saveData is on", () => {
      mockConnection({ saveData: true });
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("not duplicated when both the server and navigator report it", () => {
      document.body.classList.add("emfn-save-data");
      mockConnection({ saveData: true });
      mockReducedMotion(false);
      runScript();
      const count = document.body.className.split(/\s+/).filter(c => c === "emfn-save-data");
      expect(count).toHaveLength(1);
    });

    test("not removed when the server added it but navigator says saveData is off", () => {
      document.body.classList.add("emfn-save-data");
      mockConnection({ saveData: false });
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test.each([
      ["saveData is off", { saveData: false }],
      ["saveData is missing", {}],
      ["navigator.connection is unavailable", undefined],
    ])("not added when %s", (_label, connection) => {
      if (connection !== undefined) mockConnection(connection);
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(false);
    });

    test("added even when the lite-site banner is absent", () => {
      mockConnection({ saveData: true });
      mockReducedMotion(false);
      expect(document.querySelector(".lite-site-cta")).toBeNull();
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("kept alongside emfn-reduced-motion as the OS setting changes", () => {
      document.body.classList.add("emfn-save-data");
      const mql = mockReducedMotion(true);
      runScript();
      mql.set(false);
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("activates the lite-site banner", async () => {
      document.body.innerHTML = '<div class="lite-site-cta"></div>';
      document.body.classList.add("emfn-save-data");
      mockReducedMotion(false);
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(true);
    });
  });

  describe(".lite-site-cta banner", () => {
    beforeEach(() => {
      document.body.innerHTML = '<div class="lite-site-cta"></div>';
    });

    const cta = () => document.querySelector(".lite-site-cta");

    test("inactive with no signals", async () => {
      mockReducedMotion(false);
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(false);
    });

    test("active when reduced motion is preferred", async () => {
      mockReducedMotion(true);
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(true);
    });

    test("active when navigator.connection.saveData is on", async () => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      });
      mockReducedMotion(false);
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(true);
    });

    test("active at 20% battery or lower, inactive above", async () => {
      mockReducedMotion(false);
      const battery = { level: 0.2, addEventListener: jest.fn() };
      navigator.getBattery = jest.fn(() => Promise.resolve(battery));
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(true);

      battery.level = 0.5;
      const onLevelChange = battery.addEventListener.mock.calls.find(
        ([type]) => type === "levelchange"
      )[1];
      onLevelChange();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(false);
    });

    test("survives a rejecting getBattery", async () => {
      mockReducedMotion(false);
      navigator.getBattery = jest.fn(() => Promise.reject(new Error("blocked")));
      runScript();
      await flush();
      expect(cta().classList.contains("lite-site-cta--active")).toBe(false);
    });
  });
});
