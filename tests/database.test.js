const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

let mockDbPath;

jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("config", () => ({
  get DB_PATH() {
    return mockDbPath;
  }
}));

let tmpDir;
let databaseService;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chowbot-test-"));
  mockDbPath = path.join(tmpDir, "chowbot.db");
  jest.resetModules();
  databaseService = require("database");
});

afterEach(() => {
  databaseService.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const tables = (db) =>
  db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((t) => t.name);

const version = (db) => db.pragma("user_version", { simple: true });

describe("databaseService", () => {
  test("getDb throws before init", () => {
    expect(() => databaseService.getDb()).toThrow("not initialised");
  });

  test("init creates the full schema on a fresh database, at the baseline version", () => {
    const { BASELINE_VERSION, MIGRATIONS } = require("database/migrations");
    databaseService.init();
    const db = databaseService.getDb();
    expect(version(db)).toBe(BASELINE_VERSION + MIGRATIONS.length);
    expect(tables(db)).toEqual([
      "InvencheckerUser",
      "Karma",
      "KarmaWeeklyLeaderboardUser",
      "KarmaWeeklyLeaderboardWeek",
      "Message",
      "Server",
      "ServerChannel",
      "UsernameCache"
    ]);
  });

  test("init is idempotent", () => {
    databaseService.init();
    databaseService.getDb().prepare("INSERT INTO Server VALUES ('g1', 'Guild', 'now', 'o1')").run();
    databaseService.close();
    databaseService.init();
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Server").get().n).toBe(1);
  });

  test("the schema keeps one karma row per reaction but allows etiquette rows", () => {
    databaseService.init();
    const insert = databaseService
      .getDb()
      .prepare(
        "INSERT INTO Karma (serverId, messageId, userId, fromUserId, emojiId, value, reason, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );
    insert.run("g1", "m1", "author", "voter", "up", 1, null, 0);
    expect(() => insert.run("g1", "m1", "author", "voter", "up", 1, null, 0)).toThrow(/UNIQUE/);
    insert.run("g1", null, "author", "voter", null, 1, "nice", 1);
    insert.run("g1", null, "author", "voter", null, 1, "nice again", 1);
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Karma").get().n).toBe(3);
  });

  test("migrations added after the baseline are applied in order", () => {
    databaseService.init();
    databaseService.close();
    const { BASELINE_VERSION, MIGRATIONS } = require("database/migrations");
    const applied = [];
    MIGRATIONS.push("CREATE TABLE Extra (x INTEGER)", (db) => applied.push(tables(db).includes("Extra")));
    databaseService.init();
    expect(applied).toEqual([true]);
    expect(version(databaseService.getDb())).toBe(BASELINE_VERSION + 2);
  });

  test("a failed migration is rolled back and leaves the version unchanged", () => {
    databaseService.init();
    databaseService.close();
    const { BASELINE_VERSION, MIGRATIONS } = require("database/migrations");
    MIGRATIONS.push((db) => {
      db.exec("CREATE TABLE HalfDone (x INTEGER)");
      throw new Error("migration failed");
    });
    expect(() => databaseService.init()).toThrow("migration failed");
    expect(() => databaseService.getDb()).toThrow("not initialised");

    const db = new Database(mockDbPath);
    expect(version(db)).toBe(BASELINE_VERSION);
    expect(tables(db)).not.toContain("HalfDone");
    db.close();
  });

  test("a schema creation that fails part-way is rolled back", () => {
    // A view named like one of the later tables makes CREATE TABLE Message fail after earlier tables exist
    const raw = new Database(mockDbPath);
    raw.exec("CREATE VIEW Message AS SELECT 1 AS x");
    raw.close();

    expect(() => databaseService.init()).toThrow(/Message/);
    const db = new Database(mockDbPath);
    expect(version(db)).toBe(0);
    expect(tables(db)).toEqual([]);
    db.close();
  });

  test.each([
    ["a database with tables but no version", "CREATE TABLE Server (id TEXT PRIMARY KEY)"],
    ["a database at an older version", "PRAGMA user_version = 4"]
  ])("init refuses %s, pointing at the commit that can upgrade it", (_label, sql) => {
    const raw = new Database(mockDbPath);
    raw.exec(sql);
    raw.close();
    expect(() => databaseService.init()).toThrow(/upgrade it with chowbot commit 3fd77de/);
  });
});

describe("repositories", () => {
  let karma;
  let weekly;

  beforeEach(() => {
    databaseService.init();
    karma = require("repositories/karma");
    weekly = require("repositories/karmaWeeklyLeaderboard");
  });

  test("karma upsert, delete and total", async () => {
    await karma.upsertReactionKarma("g1", "m1", "u1", "u2", "up", 1, 0);
    await karma.upsertReactionKarma("g1", "m2", "u1", "u3", "up", 1, 0);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(2);

    await karma.upsertReactionKarma("g1", "m1", "u1", "u2", "up", -1, 0);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(0);
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Karma").get().n).toBe(2);

    await karma.deleteKarma("g1", "m2", "u3", "up");
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(-1);
    expect(await karma.getKarmaTotalByUserId("nobody")).toBeNull();
  });

  test("countKarmaSince counts etiquette reports from one user to another after a time", async () => {
    await karma.createKarma("g1", null, "target", "reporter", null, 1, "nice", 1);
    await karma.createKarma("g1", null, "target", "someone else", null, 1, "nice", 1);
    await karma.createKarma("g2", null, "target", "reporter", null, 1, "nice", 1);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const future = new Date(Date.now() + 60 * 1000).toISOString();
    expect(await karma.countKarmaSince("g1", "target", "reporter", 1, hourAgo)).toBe(1);
    expect(await karma.countKarmaSince("g1", "target", "reporter", 1, future)).toBe(0);
    expect(await karma.countKarmaSince("g1", "target", "reporter", 0, hourAgo)).toBe(0);
  });

  test("serverChannel add, list, remove and duplicates", async () => {
    const channels = require("repositories/serverChannel");
    await channels.addChannel("g1", "clearChannels", "c1");
    await channels.addChannel("g1", "clearChannels", "c2");
    await channels.addChannel("g2", "clearChannels", "c3");
    await channels.addChannel("g1", "leaderboardChannels", "l1");
    await expect(channels.addChannel("g1", "clearChannels", "c1")).rejects.toThrow("already in the list");
    expect(await channels.getChannels("g1", "clearChannels")).toEqual(["c1", "c2"]);
    expect(await channels.getAllChannels("clearChannels")).toEqual([
      { serverId: "g1", channelId: "c1" },
      { serverId: "g1", channelId: "c2" },
      { serverId: "g2", channelId: "c3" }
    ]);
    await channels.removeChannel("g1", "clearChannels", "c1");
    await expect(channels.removeChannel("g1", "clearChannels", "c1")).rejects.toThrow("isn't in the list");
    expect(await channels.getChannels("g1", "clearChannels")).toEqual(["c2"]);
  });

  test("invencheckerUser set, get and update", async () => {
    const invUsers = require("repositories/invencheckerUser");
    expect(await invUsers.getUid("u1")).toBeNull();
    await invUsers.setUid("u1", "uid-1");
    await invUsers.setUid("u1", "uid-2");
    await invUsers.setUid("u2", "uid-3");
    expect(await invUsers.getUid("u1")).toBe("uid-2");
    expect(await invUsers.getAllUsers()).toEqual([
      { discordId: "u1", uid: "uid-2" },
      { discordId: "u2", uid: "uid-3" }
    ]);
  });

  test("usernameCache only returns entries cached after the cut-off", async () => {
    const cache = require("repositories/usernameCache");
    await cache.setUsername("u1", "Alice", 1000);
    expect(await cache.getUsername("u1", 999)).toBe("Alice");
    expect(await cache.getUsername("u1", 1000)).toBeNull();
    await cache.setUsername("u1", "Alice2", 5000);
    expect(await cache.getUsername("u1", 1000)).toBe("Alice2");
    expect(await cache.getUsername("nobody", 0)).toBeNull();
    await cache.clearUsernames();
    expect(await cache.getUsername("u1", 0)).toBeNull();
  });

  test("usernameCacheService keeps usernames for 12 hours", async () => {
    const { getCachedUsername, setCachedUsername } = require("services/usernameCacheService");
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now);
    await setCachedUsername("u1", "Alice");
    spy.mockReturnValue(now + 12 * 60 * 60 * 1000 - 1);
    expect(await getCachedUsername("u1")).toBe("Alice");
    spy.mockReturnValue(now + 12 * 60 * 60 * 1000);
    expect(await getCachedUsername("u1")).toBeNull();
    spy.mockRestore();
  });

  test("etiquette karma stores null message and emoji", async () => {
    await karma.createKarma("g1", null, "u1", "u2", null, 1, "helpful", 1);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(1);
  });

  test("getKarmaLeaderboardMap ranks users and shares rank on ties", async () => {
    await karma.createKarma("g1", "m1", "a", "x", "up", 1, null, 0);
    await karma.createKarma("g1", "m2", "a", "y", "up", 1, null, 0);
    await karma.createKarma("g1", "m3", "b", "x", "up", 1, null, 0);
    await karma.createKarma("g1", "m4", "c", "x", "up", 1, null, 0);
    const map = await karma.getKarmaLeaderboardMap();
    expect(map.get("a")).toEqual({ index: 1, value: 2 });
    expect(map.get("b")).toEqual({ index: 2, value: 1 });
    expect(map.get("c")).toEqual({ index: 2, value: 1 });
  });

  test("getKarmaLeaderboardMap shares rank for users tied on zero", async () => {
    await karma.createKarma("g1", "m1", "a", "x", "up", 1, null, 0);
    await karma.createKarma("g1", "m2", "b", "x", "up", 1, null, 0);
    await karma.createKarma("g1", "m3", "b", "y", "down", -1, null, 0);
    await karma.createKarma("g1", "m4", "c", "x", "up", 1, null, 0);
    await karma.createKarma("g1", "m5", "c", "y", "down", -1, null, 0);
    await karma.createKarma("g1", "m6", "d", "x", "down", -1, null, 0);
    const map = await karma.getKarmaLeaderboardMap();
    expect(map.get("a")).toEqual({ index: 1, value: 1 });
    expect(map.get("b")).toEqual({ index: 2, value: 0 });
    expect(map.get("c")).toEqual({ index: 2, value: 0 });
    expect(map.get("d")).toEqual({ index: 3, value: -1 });
  });

  test("weekly leaderboard shares rank for users tied on zero", async () => {
    const week = await weekly.createKarmaWeeklyLeaderboardWeek("2026-09-20T21:01:00.000Z");
    await weekly.createKarmaWeeklyLeaderboardUser(week, "u1", 0);
    await weekly.createKarmaWeeklyLeaderboardUser(week, "u2", 0);
    await weekly.createKarmaWeeklyLeaderboardUser(week, "u3", -2);
    const map = await weekly.getKarmaWeeklyLeaderboardMapByWeek(week);
    expect(map.get("u1")).toEqual({ index: 1, value: 0 });
    expect(map.get("u2")).toEqual({ index: 1, value: 0 });
    expect(map.get("u3")).toEqual({ index: 2, value: -2 });
  });

  test("weekly leaderboard persists and reads back the latest week", async () => {
    const week1 = await weekly.createKarmaWeeklyLeaderboardWeek("2026-09-13T21:01:00.000Z");
    const week2 = await weekly.createKarmaWeeklyLeaderboardWeek("2026-09-20T21:01:00.000Z");
    expect(week2).toBe(week1 + 1);
    await weekly.createKarmaWeeklyLeaderboardUser(week2, "u1", 5);
    await weekly.createKarmaWeeklyLeaderboardUser(week2, "u2", 3);

    expect(await weekly.getPreviousWeekId()).toBe(week2);
    const map = await weekly.getKarmaWeeklyLeaderboardMapByWeek(week2);
    expect([...map.entries()]).toEqual([
      ["u1", { index: 1, value: 5 }],
      ["u2", { index: 2, value: 3 }]
    ]);
  });

  test("getPreviousWeekId is null when no weeks exist", async () => {
    expect(await weekly.getPreviousWeekId()).toBeNull();
  });

  test("upsertMessage ignores duplicates", async () => {
    const { upsertMessage } = require("repositories/message");
    await upsertMessage("m1", "g1", "u1", "2026-09-20T00:00:00.000Z");
    await upsertMessage("m1", "g1", "u1", "2026-09-21T00:00:00.000Z");
    const rows = databaseService.getDb().prepare("SELECT created FROM Message").all();
    expect(rows).toEqual([{ created: "2026-09-20T00:00:00.000Z" }]);
  });

  test("createServer logs instead of throwing on a duplicate", async () => {
    const logger = require("logger");
    const { createServer, deleteServer } = require("repositories/server");
    await createServer("g1", "Guild", "owner");
    await createServer("g1", "Guild", "owner");
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.objectContaining({ message: expect.stringContaining("UNIQUE") }) }),
      expect.any(String)
    );
    await deleteServer("g1");
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Server").get().n).toBe(0);
  });
});
