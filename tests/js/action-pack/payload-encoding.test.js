/**
 * Tests for Action Pack payload encoding (JavaScript)
 * Verifies that category IDs are correctly packed into base36-encoded bitmask segments
 */

const fs = require("fs");
const path = require("path");
const { packActionPackBits, segmentsToPayload } = require("../lib/payload-encoding");

// Load test fixtures
const testCases = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../fixtures/payload-test-cases.json"), "utf8")
);

describe("Action Pack Payload Encoding", () => {
  const categoryOrder = testCases.categoryOrder;

  describe("packActionPackBits()", () => {
    test("encodes single category at position 0", () => {
      const result = packActionPackBits([57], categoryOrder);
      expect(result).toEqual([1]); // bit 0 set: 0b1 = 1
    });

    test("encodes single category at position 1", () => {
      const result = packActionPackBits([58], categoryOrder);
      expect(result).toEqual([2]); // bit 1 set: 0b10 = 2
    });

    test("encodes two categories at positions 0 and 1", () => {
      const result = packActionPackBits([57, 58], categoryOrder);
      expect(result).toEqual([3]); // bits 0,1 set: 0b11 = 3
    });

    test("encodes multiple categories in order", () => {
      const result = packActionPackBits([57, 58, 59, 39], categoryOrder);
      expect(result).toEqual([15]); // bits 0,1,2,3 set: 0b1111 = 15
    });

    test("encodes categories regardless of input order", () => {
      const result = packActionPackBits([3, 57, 121, 2], categoryOrder);
      // Positions: 57=0, 2=5, 3=4, 121=7
      // Bits: 0,4,5,7 → 0b10110001 = 177... wait let me recalculate
      // Position mapping: 57=0, 58=1, 59=2, 39=3, 3=4, 2=5, 4=6, 121=7, 122=8, 123=9
      // Input: [3, 57, 121, 2] → positions [4, 0, 7, 5]
      // Bits set: 0,4,5,7 → binary 10110001 = 177 decimal
      expect(result).toEqual([177]);
    });

    test("encodes all test categories", () => {
      const result = packActionPackBits(categoryOrder, categoryOrder);
      // All 10 positions set: bits 0-9 → 0b1111111111 = 1023
      expect(result).toEqual([1023]);
    });

    test("handles empty category list", () => {
      const result = packActionPackBits([], categoryOrder);
      expect(result).toEqual([0]);
    });

    test("filters out unknown category IDs", () => {
      const result = packActionPackBits([57, 999, 58, 888], categoryOrder);
      expect(result).toEqual([3]); // Only 57 and 58 are valid
    });

    test("handles categories spanning multiple segments (if >31 categories)", () => {
      // With only 10 test categories, we can't test multi-segment naturally
      // But we can test the logic with a larger category order
      const largeCategoryOrder = Array.from({ length: 64 }, (_, i) => 1000 + i);
      const result = packActionPackBits([1000, 1031, 1032], largeCategoryOrder);
      // Position 0 (segment 0, bit 0), position 31 (segment 1, bit 0), position 32 (segment 1, bit 1)
      expect(result).toEqual([1, 3]); // [0b1, 0b11]
    });
  });

  describe("Base36 encoding", () => {
    test("converts segments to base36 correctly", () => {
      expect(segmentsToPayload([1])).toBe("ap2.1");
      expect(segmentsToPayload([2])).toBe("ap2.2");
      expect(segmentsToPayload([3])).toBe("ap2.3");
      expect(segmentsToPayload([15])).toBe("ap2.f"); // 15 in base36 is 'f'
      expect(segmentsToPayload([177])).toBe("ap2.4x"); // 177 in base36 is '4x'
      expect(segmentsToPayload([1023])).toBe("ap2.sf"); // 1023 in base36 is 'sf'
    });

    test("joins multiple segments with dots", () => {
      expect(segmentsToPayload([1, 3])).toBe("ap2.1.3");
      expect(segmentsToPayload([15, 255, 1023])).toBe("ap2.f.73.sf");
    });
  });

  describe("Round-trip test case validation", () => {
    testCases.testCases.forEach(testCase => {
      if (!testCase.expectedSegments) return; // Skip test cases without expected values

      test(`${testCase.name}`, () => {
        const segments = packActionPackBits(testCase.categoryIds, categoryOrder);
        expect(segments).toEqual(testCase.expectedSegments);

        if (testCase.expectedPayload) {
          const payload = segmentsToPayload(segments);
          expect(payload).toBe(testCase.expectedPayload);
        }
      });
    });
  });

  describe("Edge cases", () => {
    test("handles null input", () => {
      const result = packActionPackBits(null, categoryOrder);
      expect(result).toEqual([0]);
    });

    test("handles undefined input", () => {
      const result = packActionPackBits(undefined, categoryOrder);
      expect(result).toEqual([0]);
    });

    test("handles duplicate category IDs", () => {
      const result = packActionPackBits([57, 57, 58], categoryOrder);
      expect(result).toEqual([3]); // Same as [57, 58]
    });

    test("handles category ID 0 if present in order", () => {
      const orderWithZero = [0, 57, 58];
      const result = packActionPackBits([0], orderWithZero);
      expect(result).toEqual([1]); // Category 0 at position 0
    });

    test("handles negative category IDs gracefully", () => {
      const result = packActionPackBits([-1, 57], categoryOrder);
      expect(result).toEqual([1]); // -1 filtered out, only 57 encoded
    });
  });
});
