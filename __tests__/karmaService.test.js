const UPVOTE_ID = "upvote123";
const DOWNVOTE_ID = "downvote456";

jest.mock("logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("config", () => ({ APPLICATION_CONFIG_PATH: "/fake/applicationConfig.json" }));
jest.mock("services/storageHelper", () => ({
  readFile: jest.fn().mockResolvedValue({ emojiUpvoteId: "upvote123", emojiDownvoteId: "downvote456" })
}));
jest.mock("repositories/karma", () => ({
  createKarma: jest.fn(),
  updateKarma: jest.fn(),
  deleteKarma: jest.fn(),
  getKarmaTotalByUserId: jest.fn()
}));

const { createKarma, updateKarma, deleteKarma } = require("repositories/karma");
const { handleEvent, updateUserKarma } = require("services/karmaService");

beforeEach(() => {
  jest.clearAllMocks();
});

const makeReaction = ({ emojiId, authorId = "author1", guildId = "guild1", messageId = "msg1", partial = false } = {}) => ({
  _emoji: { id: emojiId },
  partial,
  message: {
    author: { id: authorId },
    guildId,
    id: messageId
  },
  fetch: jest.fn().mockResolvedValue()
});

const makeUser = ({ id = "user1", bot = false } = {}) => ({ id, bot });

describe("handleEvent", () => {
  test("ignores bot users", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ bot: true });
    await handleEvent(reaction, user, true);
    expect(updateKarma).not.toHaveBeenCalled();
  });

  test("ignores unknown emoji", async () => {
    const reaction = makeReaction({ emojiId: "unknown_emoji" });
    const user = makeUser();
    await handleEvent(reaction, user, true);
    expect(updateKarma).not.toHaveBeenCalled();
  });

  test("ignores self-reactions", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID, authorId: "user1" });
    const user = makeUser({ id: "user1" });
    await handleEvent(reaction, user, true);
    expect(updateKarma).not.toHaveBeenCalled();
  });

  test("fetches partial reactions before processing", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID, partial: true });
    const user = makeUser();
    updateKarma.mockResolvedValue(1);
    await handleEvent(reaction, user, true);
    expect(reaction.fetch).toHaveBeenCalled();
  });

  test("upvote adds +1 karma", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ id: "user1" });
    updateKarma.mockResolvedValue(1);
    await handleEvent(reaction, user, true);
    expect(updateKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", UPVOTE_ID, 1);
  });

  test("removing upvote deletes karma", async () => {
    const reaction = makeReaction({ emojiId: UPVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleEvent(reaction, user, false);
    expect(deleteKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", UPVOTE_ID);
  });

  test("downvote adds -1 karma", async () => {
    const reaction = makeReaction({ emojiId: DOWNVOTE_ID });
    const user = makeUser({ id: "user1" });
    updateKarma.mockResolvedValue(1);
    await handleEvent(reaction, user, true);
    expect(updateKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", DOWNVOTE_ID, -1);
  });

  test("removing downvote deletes karma", async () => {
    const reaction = makeReaction({ emojiId: DOWNVOTE_ID });
    const user = makeUser({ id: "user1" });
    await handleEvent(reaction, user, false);
    expect(deleteKarma).toHaveBeenCalledWith("guild1", "msg1", "user1", DOWNVOTE_ID);
  });
});

describe("updateUserKarma", () => {
  test("creates karma record when update affects 0 rows", async () => {
    updateKarma.mockResolvedValue(0);
    createKarma.mockResolvedValue();
    await updateUserKarma("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, 0);
    expect(createKarma).toHaveBeenCalledWith("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, null, 0);
  });

  test("does not create karma record when update succeeds", async () => {
    updateKarma.mockResolvedValue(1);
    await updateUserKarma("guild1", "msg1", "author1", "user1", UPVOTE_ID, 1, 0);
    expect(createKarma).not.toHaveBeenCalled();
  });
});
