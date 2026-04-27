/**
 * Parse invoice money strings (e.g. "1,00,000.00", "Not Found") to a finite number or null.
 */
function parseMoneyToNumber(value) {
  if (value == null || value === "" || value === "Not Found") return null;
  const cleaned = String(value).replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

module.exports = { parseMoneyToNumber };
