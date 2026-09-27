const UPVOTE_ID = "upvote123";
const DOWNVOTE_ID = "downvote456";

jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("services/applicationConfigService", () => ({
  getAppConfig: jest.fn().mockResolvedValue({ emojiUpvoteId: "upvote123", emojiDownvoteId: "downvote456" })
}));
jest.mock("repositories/karma", () => ({
  createKarma: jest.fn(),
  upsertReactionKarma: jest.fn(),
  deleteKarma: jest.fn(),
  countKarmaSince: jest.fn(),
  getKarmaTotalByUserId: jest.fn()
}));

const { createKarma, upsertReactionKarma, deleteKarma, countKarmaSince } = require("repositories/karma");
const { handleReaction, updateUserKarma, reportEtiquette, KARMA_TYPE } = require("services/karmaService");

beforeEach(() => {
  jest.clearAllMocks();
});

const makeReaction = ({
  emojiId,
  authorId = "author1",
  guildId = "guild1",
  messageId = "msg1",
  partial = false
} = {}) => ({
  emoji: { id: emojiId },
  partial,
  message: {
    author: { id: authorId },
    guildId,
    id: messageId
  },
  fetch: jest.fn().mockResolvedValue()
});

const makeUser = ({ id = "user1", bot = false } = {}) => ({ id, bot });

describe("handleReaction", () => {
  test("ignores bot users", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ bot: true });
    await handleReaction(reaction, user, true);
    expect(upsertReactionKarma).not.toHaveBeenCalled();
  });

  test("ignores unknown emoji", async () => {
    const reaction = makeReaction({ emojiId: "unknown_emoji" });
    const user = makeUser();
    await handleReaction(reaction, user, true);
    expect(upsertReactionKarma).not.toHaveBeenCalled();
  });

  test("ignores self-reactions", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID, authorId: "user1" });
    const user = makeUser({ id: "user1" });
    await handleReaction(reaction, user, true);
    expect(upsertReactionKarma).not.toHaveBeenCalled();
  });

  test("fetches partial reactions before processing", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID, partial: true });
    const user = makeUser();
    await handleReaction(reaction, user, true);
    expect(reaction.fetch).toHaveBeenCalled();
  });

  test("upvote adds +1 karma", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleReaction(reaction, user, true);
    expect(upsertReactionKarma).toHaveBeenCalledWith("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, 0);
  });

  test("removing upvote deletes karma", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleReaction(reaction, user, false);
    expect(deleteKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", UPVOTE_ID);
  });

  test("downvote adds -1 karma", async () => {
    const reaction = makeReaction({ emojiId: DOWNVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleReaction(reaction, user, true);
    expect(upsertReactionKarma).toHaveBeenCalledWith("guild1", "msg1", "author1", "user1", DOWNVOTE_ID, -1, 0);
  });

  test("removing downvote deletes karma", async () => {
    const reaction = makeReaction({ emojiId: DOWNVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleReaction(reaction, user, false);
    expect(deleteKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", DOWNVOTE_ID);
  });
});

describe("updateUserKarma", () => {
  test("upserts the reaction karma", async () => {
    await updateUserKarma("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, 0);
    expect(upsertReactionKarma).toHaveBeenCalledWith("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, 0);
  });
});

describe("reportEtiquette", () => {
  test("records good etiquette as +1", async () => {
    countKarmaSince.mockResolvedValue(0);
    expect(await reportEtiquette("guild1", "target", "reporter", true, "helpful")).toBe(true);
    expect(createKarma).toHaveBeenCalledWith(
      "guild1",
      null,
      "target",
      "reporter",
      null,
      1,
      "helpful",
      KARMA_TYPE.ETIQUETTE
    );
  });

  test("records bad etiquette as -1", async () => {
    countKarmaSince.mockResolvedValue(0);
    await reportEtiquette("guild1", "target", "reporter", false, "rude");
    expect(createKarma).toHaveBeenCalledWith(
      "guild1",
      null,
      "target",
      "reporter",
      null,
      -1,
      "rude",
      KARMA_TYPE.ETIQUETTE
    );
  });

  test("refuses a second report within 24 hours", async () => {
    countKarmaSince.mockResolvedValue(1);
    expect(await reportEtiquette("guild1", "target", "reporter", true, "again")).toBe(false);
    expect(createKarma).not.toHaveBeenCalled();
  });

  test("checks the cooldown from 24 hours ago", async () => {
    countKarmaSince.mockResolvedValue(0);
    const before = Date.now();
    await reportEtiquette("guild1", "target", "reporter", true, "helpful");
    const since = Date.parse(countKarmaSince.mock.calls[0][4]);
    expect(before - since).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000);
    expect(before - since).toBeLessThan(24 * 60 * 60 * 1000 + 1000);
  });
});
