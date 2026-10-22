/**
 * Tests for the production site-styles script, loaded as-is into jsdom.
 * Covers the `emfn-reduced-motion`, `emfn-save-data` and `emfn-low-battery` body classes,
 * then the lite-site banner visibility those classes drive through the plugin CSS.
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

const CSS = fs.readFileSync(
  path.join(
    __dirname,
    "../../../plugins/emfn-site-styles-plugin/assets/css/emfn-site-styles-plugin.css"
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

  // JS adds this class based on the user's save-data preference
  describe(".emfn-save-data body class", () => {
    const mockConnection = value =>
      Object.defineProperty(navigator, "connection", { value, configurable: true });

    test("added when navigator.connection.saveData is on", () => {
      mockConnection({ saveData: true });
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

    test("removed when stale markup has it but saveData is off", () => {
      document.body.classList.add("emfn-save-data");
      mockConnection({ saveData: false });
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(false);
    });

    test("applied even when the lite-site banner is absent", () => {
      mockConnection({ saveData: true });
      mockReducedMotion(false);
      expect(document.querySelector(".lite-site-cta")).toBeNull();
      runScript();
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("kept alongside emfn-reduced-motion as the OS setting changes", () => {
      mockConnection({ saveData: true });
      const mql = mockReducedMotion(true);
      runScript();
      mql.set(false);
      expect(document.body.classList.contains("emfn-save-data")).toBe(true);
    });

    test("leaves other body classes alone", () => {
      document.body.classList.add("home");
      mockConnection({ saveData: true });
      mockReducedMotion(false);
      runScript();
      expect(document.body.classList.contains("home")).toBe(true);
    });
  });

  // JS adds this class based on the device's battery status, if reported
  describe(".emfn-low-battery body class", () => {
    const DEBOUNCE_MS = 5 * 1000;
    const WINDOW_MS = 60 * 1000;

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const mockBattery = props => {
      const battery = { addEventListener: jest.fn(), removeEventListener: jest.fn(), ...props };
      navigator.getBattery = jest.fn(() => Promise.resolve(battery));
      return battery;
    };
    const batteryListener = (battery, type) =>
      battery.addEventListener.mock.calls.find(([t]) => t === type)[1];
    const hasClass = () => document.body.classList.contains("emfn-low-battery");
    // Lets the getBattery promise resolve under fake timers
    const settle = () => jest.advanceTimersByTimeAsync(0);

    test("checked straight away on load, without waiting for the debounce", async () => {
      mockReducedMotion(false);
      mockBattery({ level: 0.2, charging: false });
      runScript();
      await settle();
      expect(hasClass()).toBe(true);
    });

    test("not added at low battery while charging", async () => {
      mockReducedMotion(false);
      mockBattery({ level: 0.15, charging: true });
      runScript();
      await settle();
      expect(hasClass()).toBe(false);
    });

    test("changes apply only after the debounce", async () => {
      mockReducedMotion(false);
      const battery = mockBattery({ level: 0.2, charging: false });
      runScript();
      await settle();

      battery.level = 0.5;
      batteryListener(battery, "levelchange")();
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS - 1);
      expect(hasClass()).toBe(true);
      await jest.advanceTimersByTimeAsync(1);
      expect(hasClass()).toBe(false);
    });

    test("rapid plug/unplug collapses to the final state", async () => {
      mockReducedMotion(false);
      const battery = mockBattery({ level: 0.15, charging: true });
      runScript();
      await settle();
      const onChargingChange = batteryListener(battery, "chargingchange");

      battery.charging = false;
      onChargingChange();
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS / 2);
      battery.charging = true;
      onChargingChange();
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      expect(hasClass()).toBe(false);
    });

    test("follows unplugging within the first minute", async () => {
      mockReducedMotion(false);
      const battery = mockBattery({ level: 0.15, charging: true });
      runScript();
      await settle();

      battery.charging = false;
      batteryListener(battery, "chargingchange")();
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
      expect(hasClass()).toBe(true);
    });

    test("pinned after the first minute: listeners removed", async () => {
      mockReducedMotion(false);
      const battery = mockBattery({ level: 0.1, charging: false });
      runScript();
      await settle();
      const onLevelChange = batteryListener(battery, "levelchange");
      const onChargingChange = batteryListener(battery, "chargingchange");

      await jest.advanceTimersByTimeAsync(WINDOW_MS);
      expect(battery.removeEventListener).toHaveBeenCalledWith("levelchange", onLevelChange);
      expect(battery.removeEventListener).toHaveBeenCalledWith("chargingchange", onChargingChange);
      expect(hasClass()).toBe(true);
    });

    test("a change still debouncing when the minute ends is dropped", async () => {
      mockReducedMotion(false);
      const battery = mockBattery({ level: 0.1, charging: false });
      runScript();
      await settle();

      await jest.advanceTimersByTimeAsync(WINDOW_MS - DEBOUNCE_MS / 2);
      battery.charging = true;
      batteryListener(battery, "chargingchange")();
      await jest.advanceTimersByTimeAsync(DEBOUNCE_MS * 2);
      expect(hasClass()).toBe(true);
    });

    test("applied even when the lite-site banner is absent", async () => {
      mockReducedMotion(false);
      mockBattery({ level: 0.1, charging: false });
      expect(document.querySelector(".lite-site-cta")).toBeNull();
      runScript();
      await settle();
      expect(hasClass()).toBe(true);
    });

    test("does nothing when the Battery API is unavailable", async () => {
      mockReducedMotion(false);
      expect(runScript).not.toThrow();
      await settle();
      expect(hasClass()).toBe(false);
      expect(jest.getTimerCount()).toBe(0);
    });

    test("survives a rejecting getBattery", async () => {
      mockReducedMotion(false);
      navigator.getBattery = jest.fn(() => Promise.reject(new Error("blocked")));
      runScript();
      await settle();
      expect(hasClass()).toBe(false);
    });

    test("leaves other body classes alone", async () => {
      document.body.classList.add("home");
      mockReducedMotion(false);
      mockBattery({ level: 0.1, charging: false });
      runScript();
      await settle();
      expect(document.body.classList.contains("home")).toBe(true);
    });
  });

  // Visibility is CSS-only, driven by the body classes above
  describe(".lite-site-cta banner", () => {
    beforeAll(() => {
      document.head.innerHTML = `<style>${CSS}</style>`;
    });

    afterAll(() => {
      document.head.innerHTML = "";
    });

    beforeEach(() => {
      document.body.innerHTML =
        '<div class="lite-site-cta">Header</div><div class="lite-site-cta">Footer</div>';
    });

    const displays = () =>
      [...document.querySelectorAll(".lite-site-cta")].map(el => getComputedStyle(el).display);

    test("hidden with no signals", async () => {
      mockReducedMotion(false);
      runScript();
      await flush();
      expect(displays()).toEqual(["none", "none"]);
    });

    test("shown when reduced motion is preferred", async () => {
      mockReducedMotion(true);
      runScript();
      await flush();
      expect(displays()).toEqual(["flex", "flex"]);
    });

    test("shown when navigator.connection.saveData is on", async () => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      });
      mockReducedMotion(false);
      runScript();
      await flush();
      expect(displays()).toEqual(["flex", "flex"]);
    });

    test("shown at low battery, hidden again when plugged in", async () => {
      jest.useFakeTimers();
      try {
        mockReducedMotion(false);
        const battery = {
          level: 0.1,
          charging: false,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        };
        navigator.getBattery = jest.fn(() => Promise.resolve(battery));
        runScript();
        await jest.advanceTimersByTimeAsync(0);
        expect(displays()).toEqual(["flex", "flex"]);

        battery.charging = true;
        battery.addEventListener.mock.calls.find(([t]) => t === "chargingchange")[1]();
        await jest.advanceTimersByTimeAsync(5 * 1000);
        expect(displays()).toEqual(["none", "none"]);
      } finally {
        jest.useRealTimers();
      }
    });

    test("hidden again when the OS reduced-motion setting is switched off", async () => {
      const mql = mockReducedMotion(true);
      runScript();
      await flush();
      mql.set(false);
      expect(displays()).toEqual(["none", "none"]);
    });
  });
});
