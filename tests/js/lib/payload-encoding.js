/**
 * Action Pack Payload Encoding Logic
 *
 * This module contains the core encoding logic extracted from the WordPress plugin
 * for testing purposes. The logic mirrors the implementation in
 * plugins/emfn-action-pack-plugin/assets/js/emfn-action-pack-plugin.js
 *
 * In production, this code runs within the WordPress plugin context.
 * For testing, we extract it here to enable proper unit testing and coverage tracking.
 */

/**
 * Pack canonical Action Pack category IDs into compact 31-bit segments.
 * @param {number[]} catIds - unique category IDs to encode
 * @param {number[]} actionPackCategoryIdOrder - ordered list of all category IDs
 * @returns {number[]} Array of integer segments (31-bit bitmasks)
 */
function packActionPackBits(catIds, actionPackCategoryIdOrder) {
  const packedSegments = [];
  const segmentSize = 31;
  const catIdIndex = new Map(actionPackCategoryIdOrder.map((catId, index) => [catId, index]));

  // Handle null/undefined input
  if (!catIds || !Array.isArray(catIds)) {
    packedSegments.push(0);
    return packedSegments;
  }

  for (const catId of catIds) {
    const bitPosition = catIdIndex.get(catId);
    if (bitPosition === undefined) {
      continue;
    }

    const segmentIndex = Math.floor(bitPosition / segmentSize);
    const bitIndex = bitPosition % segmentSize;

    while (packedSegments.length <= segmentIndex) {
      packedSegments.push(0);
    }

    packedSegments[segmentIndex] |= 1 << bitIndex;
  }

  if (packedSegments.length === 0) packedSegments.push(0);
  return packedSegments;
}

/**
 * Convert packed bitmask segments to base36 payload string
 * @param {number[]} segments - Array of integer segments
 * @param {string} prefix - Payload prefix (default: 'ap2.')
 * @returns {string} Base36-encoded payload with prefix
 */
function segmentsToPayload(segments, prefix = "ap2.") {
  const base36Segs = segments.map(segment => segment.toString(36)).join(".");
  return `${prefix}${base36Segs}`;
}

module.exports = {
  packActionPackBits,
  segmentsToPayload,
};
