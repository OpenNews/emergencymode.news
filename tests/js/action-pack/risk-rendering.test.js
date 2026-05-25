/**
 * Tests for Risk Rendering Logic
 * Verifies that county and state fields are populated with actual location data
 * (regression prevention for bug where template defaults were shown instead of real values)
 */

const fs = require("fs");
const path = require("path");
const {
  createRiskElements,
  populateLocationFields,
  renderFallbackRisk,
  clearRenderedRisks,
  renderRiskList,
} = require("../lib/risk-rendering");

// Load test fixtures
const locationData = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../fixtures/location-test-data.json"), "utf8")
);

describe("Risk Rendering - Location Data Population", () => {
  let container;
  let template;

  beforeEach(() => {
    // Create a fresh DOM structure for each test
    document.body.innerHTML = `
      <ul id="risks">
        <li id="risk-template" class="is-hidden">
          <div>
            <strong class="location">New York, New York</strong> &bull;
            <span class="region">Northeast US</span>
            <span class="list">Likely risks: waves around furiously</span>
          </div>
        </li>
      </ul>
    `;

    container = document.getElementById("risks");
    template = document.getElementById("risk-template");
  });

  describe("populateLocationFields()", () => {
    test("populates county field from locData.county", () => {
      const { riskItem } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      populateLocationFields(riskItem, null, locData);

      expect(riskItem.textContent).toBe("Fulton County");
    });

    test("populates state field from locData.state", () => {
      const { riskRegion } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      populateLocationFields(null, riskRegion, locData);

      expect(riskRegion.textContent).toBe("Georgia");
    });

    test("populates both county and state fields", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.validLocations[1].locData; // Los Angeles

      populateLocationFields(riskItem, riskRegion, locData);

      expect(riskItem.textContent).toBe("Los Angeles County");
      expect(riskRegion.textContent).toBe("California");
    });

    test("handles missing county gracefully (empty string)", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.partialLocations[0].locData; // null county

      populateLocationFields(riskItem, riskRegion, locData);

      expect(riskItem.textContent).toBe("");
      expect(riskRegion.textContent).toBe("Texas");
    });

    test("handles missing state gracefully (empty string)", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.partialLocations[1].locData; // null state

      populateLocationFields(riskItem, riskRegion, locData);

      expect(riskItem.textContent).toBe("Harris County");
      expect(riskRegion.textContent).toBe("");
    });

    test("handles completely empty location data", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.emptyLocation;

      populateLocationFields(riskItem, riskRegion, locData);

      expect(riskItem.textContent).toBe("");
      expect(riskRegion.textContent).toBe("");
    });

    test("handles null riskItem element", () => {
      const { riskRegion } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      // Should not throw when riskItem is null
      expect(() => {
        populateLocationFields(null, riskRegion, locData);
      }).not.toThrow();

      expect(riskRegion.textContent).toBe("Georgia");
    });

    test("handles null riskRegion element", () => {
      const { riskItem } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      // Should not throw when riskRegion is null
      expect(() => {
        populateLocationFields(riskItem, null, locData);
      }).not.toThrow();

      expect(riskItem.textContent).toBe("Fulton County");
    });

    test("does not show template defaults when real data is available", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.validLocations[2].locData; // Cook County, IL

      populateLocationFields(riskItem, riskRegion, locData);

      // Verify template defaults are replaced
      expect(riskItem.textContent).not.toBe("New York, New York");
      expect(riskRegion.textContent).not.toBe("Northeast US");

      // Verify actual data is present
      expect(riskItem.textContent).toBe("Cook County");
      expect(riskRegion.textContent).toBe("Illinois");
    });
  });

  describe("renderFallbackRisk()", () => {
    test("renders fallback with available location data", () => {
      const { riskItem, riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      renderFallbackRisk(riskItem, riskRegion, riskType, locData);

      expect(riskItem.textContent).toBe("Fulton County");
      expect(riskRegion.textContent).toBe("Georgia");
      expect(riskType.textContent).toContain("Unable to determine specific risks");
    });

    test("renders default fallback text when county is null", () => {
      const { riskItem, riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.partialLocations[0].locData; // null county

      renderFallbackRisk(riskItem, riskRegion, riskType, locData);

      expect(riskItem.textContent).toBe("Unable to resolve location");
      expect(riskRegion.textContent).toBe("Texas");
    });

    test("renders default fallback text when state is null", () => {
      const { riskItem, riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.partialLocations[1].locData; // null state

      renderFallbackRisk(riskItem, riskRegion, riskType, locData);

      expect(riskItem.textContent).toBe("Harris County");
      expect(riskRegion.textContent).toBe("Location unavailable");
    });

    test("renders full fallback when all location data is null", () => {
      const { riskItem, riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.emptyLocation;

      renderFallbackRisk(riskItem, riskRegion, riskType, locData);

      expect(riskItem.textContent).toBe("Unable to resolve location");
      expect(riskRegion.textContent).toBe("Location unavailable");
      expect(riskType.textContent).toContain("Unable to determine specific risks");
    });

    test("renders helpful message to users", () => {
      const { riskItem, riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.emptyLocation;

      renderFallbackRisk(riskItem, riskRegion, riskType, locData);

      expect(riskType.textContent).toContain("Please pick another location");
    });

    test("handles null riskItem element in fallback", () => {
      const { riskRegion, riskType } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      expect(() => {
        renderFallbackRisk(null, riskRegion, riskType, locData);
      }).not.toThrow();

      expect(riskRegion.textContent).toBe("Georgia");
    });

    test("handles null riskRegion element in fallback", () => {
      const { riskItem, riskType } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData;

      expect(() => {
        renderFallbackRisk(riskItem, null, riskType, locData);
      }).not.toThrow();

      expect(riskItem.textContent).toBe("Fulton County");
    });
  });

  describe("createRiskElements()", () => {
    test("clones template and adds to container", () => {
      const initialChildCount = container.children.length;

      createRiskElements(container, template);

      expect(container.children.length).toBe(initialChildCount + 1);
    });

    test("removes is-hidden class and adds is-visible class", () => {
      createRiskElements(container, template);

      const visibleRisk = container.querySelector(".is-visible");
      expect(visibleRisk).not.toBeNull();
      expect(visibleRisk.classList.contains("is-hidden")).toBe(false);
      expect(visibleRisk.classList.contains("is-visible")).toBe(true);
    });

    test("removes id attribute from cloned element", () => {
      createRiskElements(container, template);

      const visibleRisk = container.querySelector(".is-visible");
      expect(visibleRisk.id).toBe("");
    });

    test("preserves template element", () => {
      createRiskElements(container, template);

      const templateStillExists = document.getElementById("risk-template");
      expect(templateStillExists).not.toBeNull();
      expect(templateStillExists.classList.contains("is-hidden")).toBe(true);
    });

    test("returns risk elements with correct selectors", () => {
      const elements = createRiskElements(container, template);

      expect(elements).not.toBeNull();
      expect(elements.riskItem).not.toBeNull();
      expect(elements.riskRegion).not.toBeNull();
      expect(elements.riskType).not.toBeNull();
    });

    test("returns null if .list element missing", () => {
      // Create a template without .list element
      template.innerHTML = `<div><strong class="location">Test</strong></div>`;

      const elements = createRiskElements(container, template);

      expect(elements).toBeNull();
    });
  });

  describe("clearRenderedRisks()", () => {
    test("removes all rendered risks while preserving template", () => {
      // Add some rendered risks
      createRiskElements(container, template);
      createRiskElements(container, template);
      createRiskElements(container, template);

      expect(container.children.length).toBe(4); // 3 rendered + 1 template

      clearRenderedRisks(container);

      expect(container.children.length).toBe(1);
      expect(document.getElementById("risk-template")).not.toBeNull();
    });

    test("handles empty container gracefully", () => {
      const emptyContainer = document.createElement("ul");

      expect(() => {
        clearRenderedRisks(emptyContainer);
      }).not.toThrow();
    });

    test("preserves element with id 'risk-template'", () => {
      createRiskElements(container, template);
      createRiskElements(container, template);

      clearRenderedRisks(container);

      const templatePreserved = document.getElementById("risk-template");
      expect(templatePreserved).not.toBeNull();
      expect(templatePreserved.classList.contains("is-hidden")).toBe(true);
    });
  });

  describe("renderRiskList()", () => {
    test("renders list of hazards", () => {
      const { riskType } = createRiskElements(container, template);
      const hazards = ["Hurricane (92%)", "Strong Wind (91%)", "Tornado (88%)"];

      renderRiskList(riskType, hazards);

      expect(riskType.textContent).toBe(
        "FEMA's top hazards: Hurricane (92%), Strong Wind (91%), Tornado (88%)"
      );
    });

    test("renders no-risk message when hazards array is empty", () => {
      const { riskType } = createRiskElements(container, template);

      renderRiskList(riskType, []);

      expect(riskType.textContent).toBe("No high risk for any specific hazards based on our data.");
    });

    test("handles single hazard", () => {
      const { riskType } = createRiskElements(container, template);

      renderRiskList(riskType, ["Wildfire (95%)"]);

      expect(riskType.textContent).toBe("FEMA's top hazards: Wildfire (95%)");
    });
  });

  describe("Regression Tests - Bug Fix Validation", () => {
    test("does NOT show template defaults (New York, New York) with real data", () => {
      const { riskItem, riskRegion } = createRiskElements(container, template);
      const locData = locationData.validLocations[0].locData; // Fulton County, Georgia

      // This is the bug fix: before the fix, template defaults would be shown
      // instead of actual county/state data
      populateLocationFields(riskItem, riskRegion, locData);

      // Verify the bug is fixed
      expect(riskItem.textContent).not.toBe("New York, New York");
      expect(riskRegion.textContent).not.toBe("Northeast US");
      expect(riskItem.textContent).toBe("Fulton County");
      expect(riskRegion.textContent).toBe("Georgia");
    });

    test("consistently populates location across multiple renders", () => {
      const locations = locationData.validLocations;

      locations.forEach(({ locData }) => {
        // Clear previous renders
        clearRenderedRisks(container);

        const { riskItem, riskRegion } = createRiskElements(container, template);
        populateLocationFields(riskItem, riskRegion, locData);

        expect(riskItem.textContent).toBe(locData.county);
        expect(riskRegion.textContent).toBe(locData.state);
      });
    });
  });
});
