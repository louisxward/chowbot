jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/serverChannel", () => ({ getAllChannels: jest.fn(), getChannels: jest.fn() }));

const logger = require("logger");
const { getAllChannels } = require("repositories/serverChannel");
const { clearChannel, clearAllChannels } = require("services/clearerService");

// A channel whose history is served in pages, like channel.messages.fetch({ limit, before })
function makeChannel(guildId, pages) {
  const remaining = [...pages];
  const deleted = [];
  const toCollection = (ids) => {
    const messages = ids.map((id) => ({ id, delete: jest.fn(async () => deleted.push(id)) }));
    return {
      size: messages.length,
      values: () => messages.values(),
      last: () => messages[messages.length - 1]
    };
  };
  return {
    guildId,
    deleted,
    messages: { fetch: jest.fn(async () => toCollection(remaining.shift() ?? [])) }
  };
}

const clientWith = (channels) => ({ channels: { cache: new Map(Object.entries(channels)) } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// clearChannel waits 500ms between deletes
async function run(promise) {
  await jest.runAllTimersAsync();
  return promise;
}

describe("clearChannel", () => {
  test("deletes every message across pages", async () => {
    const channel = makeChannel("g1", [["m1", "m2"], ["m3"]]);
    await run(clearChannel(clientWith({ c1: channel }), "g1", "c1"));
    expect(channel.deleted).toEqual(["m1", "m2", "m3"]);
  });

  test("never touches a channel that belongs to a different server", async () => {
    const channel = makeChannel("other-server", [["m1"]]);
    await run(clearChannel(clientWith({ c1: channel }), "g1", "c1"));
    expect(channel.messages.fetch).not.toHaveBeenCalled();
    expect(channel.deleted).toEqual([]);
  });

  test("skips a channel the bot can't see", async () => {
    await expect(run(clearChannel(clientWith({}), "g1", "gone"))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  test("logs instead of throwing when fetching messages fails", async () => {
    const channel = makeChannel("g1", []);
    channel.messages.fetch.mockRejectedValue(new Error("Missing Access"));
    await expect(run(clearChannel(clientWith({ c1: channel }), "g1", "c1"))).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ channelId: "c1" }), expect.any(String));
  });

  test("keeps going when one message can't be deleted", async () => {
    const channel = makeChannel("g1", [["m1", "m2"]]);
    const fetch = channel.messages.fetch.getMockImplementation();
    channel.messages.fetch.mockImplementationOnce(async (...args) => {
      const page = await fetch(...args);
      const [first] = page.values();
      first.delete.mockRejectedValue(new Error("Unknown Message"));
      return page;
    });
    await run(clearChannel(clientWith({ c1: channel }), "g1", "c1"));
    expect(channel.deleted).toEqual(["m2"]);
  });
});

describe("clearAllChannels", () => {
  test("clears each configured channel in its own server only", async () => {
    const mine = makeChannel("g1", [["m1"]]);
    const theirs = makeChannel("g2", [["m2"]]);
    getAllChannels.mockResolvedValue([
      { serverId: "g1", channelId: "mine" },
      { serverId: "g1", channelId: "theirs" }
    ]);
    await run(clearAllChannels(clientWith({ mine, theirs })));
    expect(mine.deleted).toEqual(["m1"]);
    expect(theirs.deleted).toEqual([]);
  });
});
