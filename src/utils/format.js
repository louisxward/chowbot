// Formats a number as pounds, e.g. 9.5 -> "£9.50"
function formatPrice(value) {
  return `£${value.toFixed(2)}`;
}

module.exports = { formatPrice };
