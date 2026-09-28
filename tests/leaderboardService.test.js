jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/karma", () => ({ getKarmaLeaderboardMap: jest.fn() }));
jest.mock("repositories/karmaWeeklyLeaderboard", () => ({
  createKarmaWeeklyLeaderboardWeek: jest.fn(),
  createKarmaWeeklyLeaderboardUser: jest.fn(),
  getPreviousWeekId: jest.fn().mockResolvedValue(1),
  getKarmaWeeklyLeaderboardMapByWeek: jest.fn()
}));
jest.mock("repositories/serverChannel", () => ({ getAllChannels: jest.fn() }));
jest.mock("services/usernameCacheService", () => {
  const cache = new Map();
  return {
    getCachedUsername: jest.fn(async (id) => cache.get(id) ?? null),
    setCachedUsername: jest.fn(async (id, name) => cache.set(id, name)),
    clearUsernameCache: jest.fn(async () => cache.clear())
  };
});

const { getKarmaLeaderboardMap } = require("repositories/karma");
const { getKarmaWeeklyLeaderboardMapByWeek } = require("repositories/karmaWeeklyLeaderboard");
const { getAllChannels } = require("repositories/serverChannel");
const { clearUsernameCache } = require("services/usernameCacheService");
const {
  getLeaderboardPage,
  buildLeaderboardMessage,
  sendKarmaWeeklyLeaderboard
} = require("services/leaderboardService");

const formatted = async (fetcher, page) => (await getLeaderboardPage(fetcher, page)).description;

const users = { fetch: jest.fn(async (id) => ({ displayName: `name_${id}`, username: id })) };

// [userId, rank, score] rows to the Map shape the repositories return
const board = (rows) => new Map(rows.map(([userId, index, value]) => [userId, { index, value }]));

beforeEach(async () => {
  jest.clearAllMocks();
  await clearUsernameCache();
});

describe("getLeaderboardPage", () => {
  test("returns Empty when nobody has karma", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(new Map());
    expect(await formatted(users)).toBe("Empty");
  });

  test("medals and bold names for the top three, numbered rank after", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(
      board([
        ["a", 1, 10],
        ["b", 2, 8],
        ["c", 3, 5],
        ["d", 4, 1]
      ])
    );
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const lines = (await formatted(users)).split("\n\n");
    expect(lines[0]).toContain("🥇");
    expect(lines[1]).toContain("🥈");
    expect(lines[2]).toContain("🥉");
    expect(lines[2]).toContain("**name\\_c");
    expect(lines[3]).toContain("4.");
    expect(lines[3]).not.toContain("**name");
  });

  test("shows the rank movement since last week", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(
      board([
        ["climber", 1, 20],
        ["steady", 2, 9],
        ["new", 3, 5],
        ["slipper", 4, 4],
        ["faller", 5, -3]
      ])
    );
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(
      board([
        ["faller", 1, 12],
        ["steady", 2, 9],
        ["slipper", 3, 4],
        ["climber", 5, 1]
      ])
    );
    const lines = (await formatted(users)).split("\n\n");
    expect(lines[0].startsWith("🔥")).toBe(true); // up 4 places and score went up
    expect(lines[0]).toContain("**+19"); // score change over 6 is bold
    expect(lines[1].startsWith("↔️")).toBe(true);
    expect(lines[2].startsWith("🐣")).toBe(true); // not on last week's board
    expect(lines[3].startsWith("🔽")).toBe(true);
    expect(lines[4].startsWith("💩")).toBe(true); // down 4 places and score went down
  });

  test("uses cached usernames instead of fetching them again", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["a", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    await formatted(users);
    await formatted(users);
    expect(users.fetch).toHaveBeenCalledTimes(1);
  });

  test("uses the user id when Discord can't find the user", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["ghost", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const missingUsers = { fetch: jest.fn().mockRejectedValue(new Error("Unknown User")) };
    expect(await formatted(missingUsers)).toContain("**ghost**");
  });

  test("shows 20 users per page and only fetches usernames for that page", async () => {
    const rows = Array.from({ length: 45 }, (_, i) => [`user${i}`, i + 1, 100 - i]);
    getKarmaLeaderboardMap.mockResolvedValue(board(rows));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());

    const first = await getLeaderboardPage(users, 0);
    expect(first).toMatchObject({ page: 0, count: 3 });
    expect(first.description.split("\n\n")).toHaveLength(20);
    expect(first.description).toContain("name\\_user0");
    expect(users.fetch).toHaveBeenCalledTimes(20);

    const last = await getLeaderboardPage(users, 2);
    expect(last.description.split("\n\n")).toHaveLength(5);
    expect(last.description).toContain("45.");
  });

  test("clamps pages that are out of range", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board(Array.from({ length: 25 }, (_, i) => [`u${i}`, i + 1, 50 - i])));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    expect((await getLeaderboardPage(users, 99)).page).toBe(1);
    expect((await getLeaderboardPage(users, -1)).page).toBe(0);
    expect((await getLeaderboardPage(users, NaN)).page).toBe(0);
  });

  test("every page stays under Discord's 4096 character limit, even with long names", async () => {
    const longNames = { fetch: jest.fn(async (id) => ({ displayName: `${"_*~".repeat(10)}${id}`, username: id })) };
    getKarmaLeaderboardMap.mockResolvedValue(board(Array.from({ length: 20 }, (_, i) => [`u${i}`, i + 1, -999 + i])));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    expect((await formatted(longNames, 0)).length).toBeLessThan(4096);
  });
});

describe("buildLeaderboardMessage", () => {
  test("adds page buttons with leaderboard:<page> ids when there's more than one page", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board(Array.from({ length: 30 }, (_, i) => [`u${i}`, i + 1, 50 - i])));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const message = await buildLeaderboardMessage(users, 1);
    const buttons = message.components[0].toJSON().components;
    expect(buttons.map((b) => b.custom_id)).toEqual(["leaderboard:0", "leaderboard:1:current", "leaderboard:2"]);
    expect(buttons.map((b) => b.label)).toEqual(["◀", "2/2", "▶"]);
    expect(buttons.map((b) => Boolean(b.disabled))).toEqual([false, true, true]);
  });

  test("has no buttons when everyone fits on one page", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["a", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    expect((await buildLeaderboardMessage(users)).components).toEqual([]);
  });
});

describe("sendKarmaWeeklyLeaderboard", () => {
  test("only posts to channels that belong to the server that configured them", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["a", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    getAllChannels.mockResolvedValue([
      { serverId: "g1", channelId: "ok" },
      { serverId: "g1", channelId: "otherServer" },
      { serverId: "g1", channelId: "missing" }
    ]);
    const okChannel = { guildId: "g1", send: jest.fn() };
    const otherServerChannel = { guildId: "g2", send: jest.fn() };
    const client = {
      users,
      channels: {
        cache: new Map([
          ["ok", okChannel],
          ["otherServer", otherServerChannel]
        ])
      }
    };
    await sendKarmaWeeklyLeaderboard(client);
    expect(okChannel.send).toHaveBeenCalledTimes(1);
    expect(otherServerChannel.send).not.toHaveBeenCalled();
  });

  test("keeps going when one channel fails to send", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["a", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    getAllChannels.mockResolvedValue([
      { serverId: "g1", channelId: "broken" },
      { serverId: "g1", channelId: "ok" }
    ]);
    const broken = { guildId: "g1", send: jest.fn().mockRejectedValue(new Error("Missing Access")) };
    const ok = { guildId: "g1", send: jest.fn() };
    const client = {
      users,
      channels: {
        cache: new Map([
          ["broken", broken],
          ["ok", ok]
        ])
      }
    };
    await sendKarmaWeeklyLeaderboard(client);
    expect(ok.send).toHaveBeenCalledTimes(1);
  });
});
