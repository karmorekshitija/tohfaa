/**
 * Parses processing time string to find the largest integer (e.g., "3-5 days" -> 5).
 * Fallbacks to shipsInDays if present, else defaults to 3.
 * @param {string} str - The processing_time string (e.g. "3-5 days")
 * @param {number} [shipsInDays] - Fallback integer from ships_in_days
 * @returns {number}
 */
function parseProcessingDays(str, shipsInDays) {
  if (str && typeof str === 'string') {
    const matches = str.match(/\d+/g);
    if (matches && matches.length > 0) {
      const numbers = matches.map(Number);
      return Math.max(...numbers);
    }
  }
  
  if (shipsInDays !== undefined && shipsInDays !== null && !isNaN(Number(shipsInDays))) {
    return Number(shipsInDays);
  }
  
  return 3; // Default fallback
}

module.exports = {
  parseProcessingDays
};
