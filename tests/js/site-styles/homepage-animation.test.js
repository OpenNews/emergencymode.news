/**
 * Tests for the homepage hero word rotation, loaded as-is from the HTML template backup
 * (the live copy is pasted into a WordPress HTML block).
 */

const fs = require("fs");
const path = require("path");

const TEMPLATE = fs.readFileSync(
  path.join(
    __dirname,
    "../../../plugins/emfn-site-styles-plugin/assets/html-templates/homepage_animation.html"
  ),
  "utf8"
);
const SCRIPT = TEMPLATE.match(/<script>([\s\S]*?)<\/script>/)[1];

const HOLD = 5400;

/**
 * Mock matchMedia so only the listed queries match
 * @param {string[]} matching Media queries that should match
 */
function mockMedia(matching = []) {
  window.matchMedia = jest.fn(query => ({ matches: matching.includes(query) }));
}

// Markup only: scripts set via innerHTML don't run, so the script is evaluated separately
function runTemplate() {
  document.body.innerHTML = TEMPLATE;
  window.eval(SCRIPT);
}

const activeWord = () => document.querySelector(".emfn-word.emfn-active")?.textContent;
const wordCount = () => document.querySelectorAll(".emfn-word").length;
// Lets the async start (battery check) resolve under fake timers
const settle = () => jest.advanceTimersByTimeAsync(0);

describe("Homepage hero word rotation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockMedia();
    delete navigator.connection;
    delete navigator.getBattery;
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  describe("animates once", () => {
    test("starts on the first word and holds it", async () => {
      runTemplate();
      await settle();
      expect(activeWord()).toBe("an\u00a0emergency");
      await jest.advanceTimersByTimeAsync(HOLD - 1);
      expect(activeWord()).toBe("an\u00a0emergency");
    });

    test("shows every word once, in order", async () => {
      runTemplate();
      await settle();
      const words = [...document.querySelectorAll(".emfn-word")].map(el => el.textContent);
      const seen = [activeWord()];
      for (let i = 1; i < words.length; i++) {
        await jest.advanceTimersByTimeAsync(HOLD);
        seen.push(activeWord());
      }
      expect(seen).toEqual(words);
    });

    test("settles back on the first word and stops", async () => {
      runTemplate();
      await settle();
      await jest.advanceTimersByTimeAsync(HOLD * wordCount());
      expect(activeWord()).toBe("an\u00a0emergency");
      expect(jest.getTimerCount()).toBe(0);

      await jest.advanceTimersByTimeAsync(HOLD * 10);
      expect(activeWord()).toBe("an\u00a0emergency");
    });

    test("only one word is active at a time", async () => {
      runTemplate();
      await settle();
      for (let i = 0; i < wordCount(); i++) {
        expect(document.querySelectorAll(".emfn-word.emfn-active")).toHaveLength(1);
        await jest.advanceTimersByTimeAsync(HOLD);
      }
    });

    test("still animates at low battery while charging", async () => {
      navigator.getBattery = jest.fn(() => Promise.resolve({ level: 0.1, charging: true }));
      runTemplate();
      await settle();
      await jest.advanceTimersByTimeAsync(HOLD);
      expect(activeWord()).not.toBe("an\u00a0emergency");
    });

    test("still animates when getBattery rejects", async () => {
      navigator.getBattery = jest.fn(() => Promise.reject(new Error("blocked")));
      runTemplate();
      await settle();
      await jest.advanceTimersByTimeAsync(HOLD);
      expect(activeWord()).not.toBe("an\u00a0emergency");
    });
  });

  describe("does not animate with a lite-site signal", () => {
    // Checks every step: a full rotation also ends on the first word, so the end state alone
    // can't tell "never animated" from "animated once"
    const expectStill = async () => {
      runTemplate();
      await settle();
      for (let i = 0; i < wordCount(); i++) {
        await jest.advanceTimersByTimeAsync(HOLD);
        expect(activeWord()).toBe("an\u00a0emergency");
      }
      expect(jest.getTimerCount()).toBe(0);
    };

    test("prefers-reduced-motion", async () => {
      mockMedia(["(prefers-reduced-motion: reduce)"]);
      await expectStill();
    });

    test("prefers-reduced-data", async () => {
      mockMedia(["(prefers-reduced-data: reduce)"]);
      await expectStill();
    });

    test("navigator.connection.saveData", async () => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
        configurable: true,
      });
      await expectStill();
    });

    test("low battery (20% or lower, not charging)", async () => {
      navigator.getBattery = jest.fn(() => Promise.resolve({ level: 0.2, charging: false }));
      await expectStill();
    });
  });

  test("does nothing without .emfn-word elements", async () => {
    document.body.innerHTML = "<h1>No words</h1>";
    expect(() => window.eval(SCRIPT)).not.toThrow();
    await settle();
    expect(jest.getTimerCount()).toBe(0);
  });

  describe("screen readers", () => {
    /**
     * Text a screen reader gets: skips aria-hidden subtrees, normalizes whitespace
     * @param {Node} node Root node
     * @returns {string} Accessible text
     */
    const accessibleText = node => {
      const walk = n => {
        if (n.nodeType === Node.TEXT_NODE) return n.textContent;
        if (n.nodeType !== Node.ELEMENT_NODE || n.getAttribute("aria-hidden") === "true") {
          return "";
        }
        return [...n.childNodes].map(walk).join("");
      };
      return walk(node).replace(/\s+/g, " ").trim();
    };
    const heading = () => document.getElementById("emfn-hero-h1");
    const SENTENCE = "Get help before, during and after an emergency";

    test("every rotating word is aria-hidden", () => {
      runTemplate();
      const words = [...document.querySelectorAll(".emfn-word")];
      expect(words.length).toBeGreaterThan(1);
      words.forEach(word => expect(word.getAttribute("aria-hidden")).toBe("true"));
    });

    test("heading reads as one sentence", () => {
      runTemplate();
      expect(accessibleText(heading())).toBe(SENTENCE);
    });

    test("heading text stays the same while the words rotate", async () => {
      runTemplate();
      await settle();
      for (let i = 0; i < wordCount(); i++) {
        await jest.advanceTimersByTimeAsync(HOLD);
        expect(accessibleText(heading())).toBe(SENTENCE);
      }
    });
  });
});
