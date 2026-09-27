jest.mock("logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/karma", () => ({ getKarmaLeaderboardMap: jest.fn() }));
jest.mock("repositories/karmaWeeklyLeaderboard", () => ({
  createKarmaWeeklyLeaderboardWeek: jest.fn(),
  createKarmaWeeklyLeaderboardUser: jest.fn(),
  getPreviousWeekId: jest.fn().mockResolvedValue(1),
  getKarmaWeeklyLeaderboardMapByWeek: jest.fn()
}));
jest.mock("repositories/serverChannel", () => ({ getAllChannels: jest.fn() }));
jest.mock("services/sessionStateStorage", () => {
  const cache = new Map();
  return {
    getCachedUsername: jest.fn(async (id) => cache.get(id) ?? null),
    setCachedUsername: jest.fn(async (id, name) => cache.set(id, name)),
    clearSessionState: jest.fn(async () => cache.clear())
  };
});

const { getKarmaLeaderboardMap } = require("repositories/karma");
const { getKarmaWeeklyLeaderboardMapByWeek } = require("repositories/karmaWeeklyLeaderboard");
const { getAllChannels } = require("repositories/serverChannel");
const { clearSessionState } = require("services/sessionStateStorage");
const { getKarmaWeeklyLeaderboardFormatted, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");

const users = { fetch: jest.fn(async (id) => ({ displayName: `name_${id}`, username: id })) };

// [userId, rank, score] rows to the Map shape the repositories return
const board = (rows) => new Map(rows.map(([userId, index, value]) => [userId, { index, value }]));

beforeEach(async () => {
  jest.clearAllMocks();
  await clearSessionState();
});

describe("getKarmaWeeklyLeaderboardFormatted", () => {
  test("returns Empty when nobody has karma", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(new Map());
    expect(await getKarmaWeeklyLeaderboardFormatted(users)).toBe("Empty");
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
    const lines = (await getKarmaWeeklyLeaderboardFormatted(users)).split("\n\n");
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
    const lines = (await getKarmaWeeklyLeaderboardFormatted(users)).split("\n\n");
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
    await getKarmaWeeklyLeaderboardFormatted(users);
    await getKarmaWeeklyLeaderboardFormatted(users);
    expect(users.fetch).toHaveBeenCalledTimes(1);
  });

  test("uses the user id when Discord can't find the user", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(board([["ghost", 1, 1]]));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const missingUsers = { fetch: jest.fn().mockRejectedValue(new Error("Unknown User")) };
    expect(await getKarmaWeeklyLeaderboardFormatted(missingUsers)).toContain("**ghost**");
  });

  test("stops before Discord's 4096 character limit and says how many are left", async () => {
    const rows = Array.from({ length: 200 }, (_, i) => [`user${i}`, i + 1, 200 - i]);
    getKarmaLeaderboardMap.mockResolvedValue(board(rows));
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const description = await getKarmaWeeklyLeaderboardFormatted(users);
    expect(description.length).toBeLessThanOrEqual(4096);
    const shown = description.split("\n\n").length - 1;
    expect(description.endsWith(`…and ${200 - shown} more`)).toBe(true);
    // Stops fetching usernames once the embed is full
    expect(users.fetch.mock.calls.length).toBeLessThan(200);
  });

  test("shows everyone without a footer when it fits", async () => {
    getKarmaLeaderboardMap.mockResolvedValue(
      board([
        ["a", 1, 2],
        ["b", 2, 1]
      ])
    );
    getKarmaWeeklyLeaderboardMapByWeek.mockResolvedValue(new Map());
    const description = await getKarmaWeeklyLeaderboardFormatted(users);
    expect(description.split("\n\n")).toHaveLength(2);
    expect(description).not.toContain("more");
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
