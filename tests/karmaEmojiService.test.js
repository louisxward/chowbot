jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("services/applicationConfigService", () => ({ getAppConfig: jest.fn() }));

const logger = require("logger");
const { getAppConfig } = require("services/applicationConfigService");
const {
  validateKarmaEmojis,
  getKarmaEmojis,
  findKarmaEmoji,
  hasKarmaEmojis,
  clearKarmaEmojis
} = require("services/karmaEmojiService");

const clientWithEmojis = (ids) => ({
  application: { emojis: { fetch: jest.fn(async () => new Map(ids.map((id) => [id, { name: `emoji_${id}` }]))) } }
});

beforeEach(() => {
  jest.clearAllMocks();
  clearKarmaEmojis();
});

test("loads karma emojis sorted by sort", async () => {
  getAppConfig.mockResolvedValue({
    karmaEmojis: [
      { id: "222", sort: 2, value: -1 },
      { id: "🔥", sort: 3, value: 3 },
      { id: "111", sort: 1, value: 1 }
    ]
  });
  await validateKarmaEmojis(clientWithEmojis(["111", "222"]));
  expect(getKarmaEmojis()).toEqual([
    { id: "111", sort: 1, value: 1 },
    { id: "222", sort: 2, value: -1 },
    { id: "🔥", sort: 3, value: 3 }
  ]);
  expect(hasKarmaEmojis()).toBe(true);
});

test("finds custom emojis by id and unicode emojis by character", async () => {
  getAppConfig.mockResolvedValue({
    karmaEmojis: [
      { id: "111", sort: 1, value: 1 },
      { id: "🔥", sort: 2, value: 3 }
    ]
  });
  await validateKarmaEmojis(clientWithEmojis(["111"]));
  expect(findKarmaEmoji({ id: "111", name: "upvote" })).toMatchObject({ value: 1 });
  expect(findKarmaEmoji({ id: null, name: "🔥" })).toMatchObject({ value: 3 });
  expect(findKarmaEmoji({ id: null, name: "😀" })).toBeUndefined();
  expect(findKarmaEmoji({ id: "999", name: "other" })).toBeUndefined();
});

test("sort is optional and falls back to the list order", async () => {
  getAppConfig.mockResolvedValue({
    karmaEmojis: [
      { id: "👍", value: 1 },
      { id: "👎", value: -1 }
    ]
  });
  await validateKarmaEmojis(clientWithEmojis([]));
  expect(getKarmaEmojis().map((emoji) => emoji.id)).toEqual(["👍", "👎"]);
});

test("unicode-only config doesn't need to fetch application emojis", async () => {
  getAppConfig.mockResolvedValue({ karmaEmojis: [{ id: "👍", value: 1 }] });
  const client = clientWithEmojis([]);
  await validateKarmaEmojis(client);
  expect(client.application.emojis.fetch).not.toHaveBeenCalled();
});

test.each([
  [{ sort: 1, value: 1 }, "missing id"],
  [{ id: 111, sort: 1, value: 1 }, "id must be a string, in quotes"],
  [{ id: "111", sort: 1, value: 1.5 }, "value must be a whole number"],
  [{ id: "111", sort: "first", value: 1 }, "sort must be a number"],
  [{ id: "404", sort: 1, value: 1 }, "not an emoji on this application"]
])("skips an invalid entry %j (%s) and keeps the rest", async (entry, problem) => {
  getAppConfig.mockResolvedValue({ karmaEmojis: [entry, { id: "👍", value: 1 }] });
  await validateKarmaEmojis(clientWithEmojis(["111"]));
  expect(getKarmaEmojis().map((emoji) => emoji.id)).toEqual(["👍"]);
  expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ problem }), expect.any(String));
});

test("skips duplicate ids", async () => {
  getAppConfig.mockResolvedValue({
    karmaEmojis: [
      { id: "👍", value: 1 },
      { id: "👍", value: 5 }
    ]
  });
  await validateKarmaEmojis(clientWithEmojis([]));
  expect(getKarmaEmojis()).toEqual([{ id: "👍", sort: 0, value: 1 }]);
});

test("karma reactions are off when nothing valid is configured", async () => {
  getAppConfig.mockResolvedValue({});
  await validateKarmaEmojis(clientWithEmojis([]));
  expect(hasKarmaEmojis()).toBe(false);
});

test("still reads the old emojiUpvoteId/emojiDownvoteId config as +1/-1", async () => {
  getAppConfig.mockResolvedValue({ emojiUpvoteId: "111", emojiDownvoteId: "222" });
  await validateKarmaEmojis(clientWithEmojis(["111", "222"]));
  expect(getKarmaEmojis()).toEqual([
    { id: "111", sort: 1, value: 1 },
    { id: "222", sort: 2, value: -1 }
  ]);
  expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("deprecated"));
});

test("karmaEmojis wins over the old config when both are set", async () => {
  getAppConfig.mockResolvedValue({ emojiUpvoteId: "111", karmaEmojis: [{ id: "👍", value: 2 }] });
  await validateKarmaEmojis(clientWithEmojis(["111"]));
  expect(getKarmaEmojis().map((emoji) => emoji.id)).toEqual(["👍"]);
});
