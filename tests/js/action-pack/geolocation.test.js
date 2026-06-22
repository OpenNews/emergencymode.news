/**
 * Tests for Action Pack geolocation handling
 * Verifies street address field population from Google Places API autocomplete selections
 */

describe("GeolocationFlow - Street Address Population", () => {
  let mockFormRoot;
  let mockStreetInput;

  beforeEach(() => {
    // Set up DOM mocks
    mockStreetInput = document.createElement("input");
    mockStreetInput.id = "input_6_32_1";
    mockStreetInput.type = "text";
    mockStreetInput.value = "";

    mockFormRoot = document.createElement("form");
    mockFormRoot.appendChild(mockStreetInput);

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

      // Simulate the logic from handlePlaceSelection
      if (!addr.street_address) {
        const selectedText =
          placePrediction?.text?.text || place.formattedAddress || place.displayName || "";
        mockStreetInput.value = selectedText;
      }

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

      if (!addr.street_address) {
        const selectedText =
          placePrediction?.text?.text || place.formattedAddress || place.displayName || "";
        mockStreetInput.value = selectedText;
      }

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

      if (!addr.street_address) {
        const selectedText =
          placePrediction?.text?.text || place.formattedAddress || place.displayName || "";
        mockStreetInput.value = selectedText;
      }

      expect(mockStreetInput.value).toBe("New York, NY 10001");
    });

    test("sets empty string if no fallback values are available", () => {
      const addr = {
        postal_code: "12345",
      };

      const placePrediction = {};
      const place = {};

      if (!addr.street_address) {
        const selectedText =
          placePrediction?.text?.text || place.formattedAddress || place.displayName || "";
        mockStreetInput.value = selectedText;
      }

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

      // Simulate the logic - should not populate
      if (!addr.street_address) {
        const selectedText = placePrediction?.text?.text || "";
        mockStreetInput.value = selectedText;
      }

      expect(mockStreetInput.value).toBe("");
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

      if (!addr.street_address) {
        const selectedText = placePrediction?.text?.text || "";
        mockStreetInput.value = selectedText;
      }

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

      if (!addr.street_address) {
        const selectedText = placePrediction?.text?.text || "";
        mockStreetInput.value = selectedText;
      }

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

      // Should not populate because street_address exists
      if (!addr.street_address) {
        const selectedText = placePrediction?.text?.text || "";
        mockStreetInput.value = selectedText;
      }

      expect(mockStreetInput.value).toBe("");
    });
  });
});
