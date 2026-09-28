// Turns rows sorted by total (highest first) into a Map of userId -> { index, value }, where
// index is the rank. Users on the same total share a rank, and the next total takes the next
// rank (1, 2, 2, 3).
function toRankedMap(rows) {
  const ranked = new Map();
  let index = 0;
  let previousTotal = null;
  for (const { userId, total } of rows) {
    if (previousTotal === null || total < previousTotal) {
      previousTotal = total;
      index += 1;
    }
    ranked.set(userId, { index, value: total });
  }
  return ranked;
}

module.exports = { toRankedMap };
