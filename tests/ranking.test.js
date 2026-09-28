const { toRankedMap } = require("utils/ranking");

const rows = (...pairs) => pairs.map(([userId, total]) => ({ userId, total }));

test("ranks in order and shares ranks on ties", () => {
  const ranked = toRankedMap(rows(["a", 5], ["b", 3], ["c", 3], ["d", 1]));
  expect([...ranked]).toEqual([
    ["a", { index: 1, value: 5 }],
    ["b", { index: 2, value: 3 }],
    ["c", { index: 2, value: 3 }],
    ["d", { index: 3, value: 1 }]
  ]);
});

test("ties on zero and negative totals share a rank", () => {
  const ranked = toRankedMap(rows(["a", 0], ["b", 0], ["c", -2], ["d", -2]));
  expect([...ranked.values()].map((entry) => entry.index)).toEqual([1, 1, 2, 2]);
});

test("empty rows give an empty map", () => {
  expect(toRankedMap([]).size).toBe(0);
});
