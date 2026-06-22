/**
 * Tests for Action Pack geolocation handling
 * Verifies street address field population from Google Places API autocomplete selections
 */

const { populateStreetAddressField } = require("../lib/geolocation");

describe("GeolocationFlow - Street Address Population", () => {
  let mockFormRoot;
  let mockStreetInput;
  let mockLocationContainer;

  beforeEach(() => {
    // Set up DOM mocks matching Gravity Forms address field structure
    mockStreetInput = document.createElement("input");
    mockStreetInput.type = "text";
    mockStreetInput.value = "";
    mockStreetInput.setAttribute("autocomplete", "street-address address-level4 address-level3");

    // Create .location container (matches GeolocationFlow.gravityGeoInput selector)
    mockLocationContainer = document.createElement("div");
    mockLocationContainer.className = "location";
    mockLocationContainer.appendChild(mockStreetInput);

    mockFormRoot = document.createElement("form");
    mockFormRoot.appendChild(mockLocationContainer);

    document.body.appendChild(mockFormRoot);
  });

  afterEach(() => {
    document.body.removeChild(mockFormRoot);
  });

  describe("when place has no street_address component", () => {
    test("populates street input with selected text from autocomplete menu", () => {
      const addr = {
        postal_code: "07712",
        locality: "Asbury Park",
        administrative_area_level_1: "New Jersey",
        administrative_area_level_1_short: "NJ",
      };

      const placePrediction = {
        text: {
          text: "Ocean Township, NJ 07712, USA",
        },
      };

      const place = {
        formattedAddress: "Ocean Township, NJ 07712, USA",
      };

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("Ocean Township, NJ 07712, USA");
    });

    test("falls back to formattedAddress if placePrediction.text.text is unavailable", () => {
      const addr = {
        postal_code: "90210",
        locality: "Beverly Hills",
      };

      const placePrediction = {
        text: undefined,
      };

      const place = {
        formattedAddress: "Beverly Hills, CA 90210, USA",
      };

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("Beverly Hills, CA 90210, USA");
    });

    test("falls back to displayName if both text.text and formattedAddress are unavailable", () => {
      const addr = {
        postal_code: "10001",
      };

      const placePrediction = {
        text: undefined,
      };

      const place = {
        displayName: "New York, NY 10001",
      };

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("New York, NY 10001");
    });

    test("sets empty string if no fallback values are available", () => {
      const addr = {
        postal_code: "12345",
      };

      const placePrediction = {};
      const place = {};

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("");
    });
  });

  describe("when place has street_address component", () => {
    test("does not populate street input (Gravity Forms handles it)", () => {
      const addr = {
        street_address: "123 Main Street",
        locality: "Springfield",
        administrative_area_level_1: "Illinois",
      };

      const placePrediction = {
        text: {
          text: "123 Main Street, Springfield, IL, USA",
        },
      };

      const place = {};

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(false);
      expect(mockStreetInput.value).toBe("");
    });
  });

  describe("selector fallback strategies", () => {
    test("uses label-based fallback when autocomplete attribute is missing", () => {
      // Create input without autocomplete attribute
      const inputWithoutAutocomplete = document.createElement("input");
      inputWithoutAutocomplete.type = "text";
      inputWithoutAutocomplete.value = "";
      inputWithoutAutocomplete.id = "street-input-123";

      // Create label pointing to the input
      const label = document.createElement("label");
      label.textContent = "Street Address";
      label.setAttribute("for", "street-input-123");

      const container = document.createElement("div");
      container.appendChild(label);
      container.appendChild(inputWithoutAutocomplete);

      const formWithoutAutocomplete = document.createElement("form");
      formWithoutAutocomplete.appendChild(container);
      document.body.appendChild(formWithoutAutocomplete);

      const addr = { postal_code: "12345" };
      const placePrediction = { text: { text: "Test Location" } };
      const place = {};

      const wasPopulated = populateStreetAddressField(
        formWithoutAutocomplete,
        addr,
        placePrediction,
        place
      );

      expect(wasPopulated).toBe(true);
      expect(inputWithoutAutocomplete.value).toBe("Test Location");

      document.body.removeChild(formWithoutAutocomplete);
    });

    test("returns false when no street input can be found", () => {
      const emptyForm = document.createElement("form");
      document.body.appendChild(emptyForm);

      const addr = { postal_code: "12345" };
      const placePrediction = { text: { text: "Test Location" } };
      const place = {};

      const wasPopulated = populateStreetAddressField(emptyForm, addr, placePrediction, place);

      expect(wasPopulated).toBe(false);

      document.body.removeChild(emptyForm);
    });
  });

  describe("address component parsing", () => {
    test("correctly identifies missing street_address component", () => {
      const addressComponents = [
        { types: ["postal_code"], longText: "07712", shortText: "07712" },
        { types: ["locality"], longText: "Asbury Park", shortText: "Asbury Park" },
        {
          types: ["administrative_area_level_1"],
          longText: "New Jersey",
          shortText: "NJ",
        },
        { types: ["country"], longText: "United States", shortText: "US" },
      ];

      const addr = addressComponents.reduce((acc, { types, longText, shortText }) => {
        types.forEach(type => {
          acc[type] = longText;
          acc[`${type}_short`] = shortText;
        });
        return acc;
      }, {});

      expect(addr.street_address).toBeUndefined();
      expect(addr.postal_code).toBe("07712");
      expect(addr.locality).toBe("Asbury Park");
    });

    test("correctly identifies present street_address component", () => {
      const addressComponents = [
        { types: ["street_address"], longText: "123 Main St", shortText: "123 Main St" },
        { types: ["locality"], longText: "Springfield", shortText: "Springfield" },
      ];

      const addr = addressComponents.reduce((acc, { types, longText, shortText }) => {
        types.forEach(type => {
          acc[type] = longText;
          acc[`${type}_short`] = shortText;
        });
        return acc;
      }, {});

      expect(addr.street_address).toBe("123 Main St");
    });
  });

  describe("real-world selection scenarios", () => {
    test("handles ZIP code-only selection (e.g., '07712')", () => {
      const addr = {
        postal_code: "07712",
        locality: "Asbury Park",
        administrative_area_level_1: "New Jersey",
        administrative_area_level_1_short: "NJ",
      };

      const placePrediction = {
        text: {
          text: "07712",
        },
      };

      const place = {};

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("07712");
    });

    test("handles city selection (e.g., 'Asbury Park, NJ')", () => {
      const addr = {
        locality: "Asbury Park",
        administrative_area_level_1: "New Jersey",
        administrative_area_level_1_short: "NJ",
      };

      const placePrediction = {
        text: {
          text: "Asbury Park, NJ, USA",
        },
      };

      const place = {};

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(true);
      expect(mockStreetInput.value).toBe("Asbury Park, NJ, USA");
    });

    test("handles full address with street selection", () => {
      const addr = {
        street_address: "123 Main Street",
        locality: "Anytown",
        administrative_area_level_1: "California",
      };

      const placePrediction = {
        text: {
          text: "123 Main Street, Anytown, CA, USA",
        },
      };

      const place = {};

      const wasPopulated = populateStreetAddressField(mockFormRoot, addr, placePrediction, place);

      expect(wasPopulated).toBe(false);
      expect(mockStreetInput.value).toBe("");
    });
  });
});
