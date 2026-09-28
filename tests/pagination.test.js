const {
  chunkLines,
  sectionsToFields,
  paginateFields,
  buildPageButtons,
  clampPage,
  pageCount
} = require("utils/pagination");

describe("chunkLines", () => {
  test("keeps whole lines together up to the limit", () => {
    expect(chunkLines(["aaa", "bbb", "ccc"], 7)).toEqual(["aaa\nbbb", "ccc"]);
  });

  test("never splits a line across chunks", () => {
    const lines = Array.from({ length: 50 }, (_, i) => `line ${i} ${"x".repeat(i % 7)}`);
    const chunks = chunkLines(lines, 60);
    expect(chunks.every((chunk) => chunk.length <= 60)).toBe(true);
    expect(chunks.join("\n").split("\n")).toEqual(lines);
  });

  test("cuts a single over-long line short with an ellipsis", () => {
    expect(chunkLines(["x".repeat(20)], 10)).toEqual([`${"x".repeat(9)}…`]);
  });

  test("returns nothing for no lines", () => {
    expect(chunkLines([], 100)).toEqual([]);
  });
});

describe("sectionsToFields", () => {
  test("splits a section over the 1024 field limit into continued fields", () => {
    const lines = Array.from({ length: 60 }, (_, i) => `item ${i} ${"-".repeat(20)}`);
    const fields = sectionsToFields([{ name: "Custom Items", lines }]);
    expect(fields.length).toBeGreaterThan(1);
    expect(fields[0].name).toBe("Custom Items");
    expect(fields[1].name).toBe("Custom Items (cont.)");
    expect(fields.every((field) => field.value.length <= 1024)).toBe(true);
    expect(
      fields
        .map((field) => field.value)
        .join("\n")
        .split("\n")
    ).toEqual(lines);
  });

  test("drops sections with no lines", () => {
    expect(sectionsToFields([{ name: "Empty", lines: [] }])).toEqual([]);
  });
});

describe("paginateFields", () => {
  const field = (n, size = 10) => ({ name: `f${n}`, value: "v".repeat(size) });

  test("starts a new page after maxFields", () => {
    const pages = paginateFields(
      Array.from({ length: 12 }, (_, i) => field(i)),
      { maxFields: 5 }
    );
    expect(pages.map((page) => page.length)).toEqual([5, 5, 2]);
  });

  test("starts a new page before going over maxChars", () => {
    const pages = paginateFields([field(1, 900), field(2, 900), field(3, 900)], { maxChars: 2000 });
    expect(pages.map((page) => page.length)).toEqual([2, 1]);
  });
});

describe("buildPageButtons", () => {
  const ids = (rows) => rows[0].toJSON().components.map((button) => button.custom_id);

  test("no buttons for a single page", () => {
    expect(buildPageButtons((p) => `x:${p}`, 0, 1)).toEqual([]);
  });

  test("previous is disabled on the first page and next on the last", () => {
    const first = buildPageButtons((p) => `x:${p}`, 0, 3)[0].toJSON().components;
    expect(first[0].disabled).toBe(true);
    expect(first[2].disabled).toBe(false);
    const last = buildPageButtons((p) => `x:${p}`, 2, 3)[0].toJSON().components;
    expect(last[0].disabled).toBe(false);
    expect(last[2].disabled).toBe(true);
  });

  test("custom ids are unique and point at the neighbouring pages", () => {
    expect(ids(buildPageButtons((p) => `x:${p}`, 1, 3))).toEqual(["x:0", "x:1:current", "x:2"]);
  });
});

test("clampPage and pageCount", () => {
  expect(pageCount(0, 20)).toBe(1);
  expect(pageCount(41, 20)).toBe(3);
  expect(clampPage(5, 3)).toBe(2);
  expect(clampPage(-1, 3)).toBe(0);
  expect(clampPage(Number("abc"), 3)).toBe(0);
});
