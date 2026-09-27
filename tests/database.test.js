const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Database = require("better-sqlite3");

let mockDbPath;

jest.mock("logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
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
  databaseService = require("services/databaseService");
});

afterEach(() => {
  databaseService.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const V1_SCHEMA = `
  CREATE TABLE Server (id TEXT PRIMARY KEY, name TEXT NOT NULL, invited TEXT NOT NULL, ownerUserId TEXT NOT NULL);
  CREATE TABLE Karma (
    id INTEGER PRIMARY KEY AUTOINCREMENT, serverId TEXT NOT NULL, messageId TEXT NOT NULL,
    messageUserId TEXT NOT NULL, reactionUserId TEXT NOT NULL, reactionEmojiId TEXT NOT NULL, value INTEGER NOT NULL
  );
  CREATE TABLE KarmaWeeklyLeaderboardWeek (id INTEGER PRIMARY KEY AUTOINCREMENT, created TEXT NOT NULL);
  CREATE TABLE KarmaWeeklyLeaderboardUser (
    id INTEGER PRIMARY KEY AUTOINCREMENT, weekId INTEGER NOT NULL, userId TEXT NOT NULL, value INTEGER NOT NULL
  );
`;

describe("databaseService", () => {
  test("getDb throws before init", () => {
    expect(() => databaseService.getDb()).toThrow("not initialised");
  });

  test("init creates the latest schema on a fresh database", () => {
    databaseService.init();
    const db = databaseService.getDb();
    expect(db.pragma("user_version", { simple: true })).toBe(2);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((t) => t.name);
    expect(tables).toEqual(["Karma", "KarmaWeeklyLeaderboardUser", "KarmaWeeklyLeaderboardWeek", "Message", "Server"]);
  });

  test("init is idempotent", () => {
    databaseService.init();
    databaseService.getDb().prepare("INSERT INTO Server VALUES ('g1', 'Guild', 'now', 'o1')").run();
    databaseService.close();
    databaseService.init();
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Server").get().n).toBe(1);
  });

  test("init migrates a v1 database and keeps karma rows", () => {
    const v1 = new Database(mockDbPath);
    v1.exec(V1_SCHEMA);
    v1.prepare("INSERT INTO Karma VALUES (7, 'g1', 'm1', 'author', 'voter', 'e1', 1)").run();
    v1.pragma("user_version = 1");
    v1.close();

    databaseService.init();
    const db = databaseService.getDb();
    expect(db.pragma("user_version", { simple: true })).toBe(2);
    expect(db.prepare("SELECT * FROM Karma").get()).toEqual({
      id: 7,
      serverId: "g1",
      messageId: "m1",
      userId: "author",
      fromUserId: "voter",
      emojiId: "e1",
      value: 1,
      reason: null,
      type: 0
    });
    expect(db.prepare("SELECT id, serverId, userId FROM Message").all()).toEqual([
      { id: "m1", serverId: "g1", userId: "author" }
    ]);
  });

  test("a failed migration is rolled back and leaves the version unchanged", () => {
    const v1 = new Database(mockDbPath);
    // A Message table with the wrong columns makes migration v2 fail on its last statement,
    // after it has already dropped and renamed Karma
    v1.exec(V1_SCHEMA + "CREATE TABLE Message (unrelated INTEGER);");
    v1.prepare("INSERT INTO Karma VALUES (1, 'g1', 'm1', 'author', 'voter', 'e1', 1)").run();
    v1.pragma("user_version = 1");
    v1.close();

    expect(() => databaseService.init()).toThrow();
    databaseService.close();

    const db = new Database(mockDbPath);
    expect(db.pragma("user_version", { simple: true })).toBe(1);
    expect(db.prepare("SELECT messageUserId FROM Karma").get()).toEqual({ messageUserId: "author" });
    db.close();
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

  test("karma create, update, delete and total", async () => {
    await karma.createKarma("g1", "m1", "u1", "u2", "up", 1, null, 0);
    await karma.createKarma("g1", "m2", "u1", "u3", "up", 1, null, 0);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(2);

    expect(await karma.updateKarma("g1", "m1", "u2", "up", -1)).toBe(1);
    expect(await karma.updateKarma("g1", "missing", "u2", "up", -1)).toBe(0);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(0);

    await karma.deleteKarma("g1", "m2", "u3", "up");
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(-1);
    expect(await karma.getKarmaTotalByUserId("nobody")).toBeNull();
  });

  test("etiquette karma stores null message and emoji", async () => {
    await karma.createKarma("g1", null, "u1", "u2", null, 1, "helpful", 1);
    expect(await karma.getKarmaTotalByUserId("u1")).toBe(1);
  });

  test("getKarmaByMessageAndEmoji lists voters", async () => {
    await karma.createKarma("g1", "m1", "u1", "u2", "up", 1, null, 0);
    await karma.createKarma("g1", "m1", "u1", "u3", "up", 1, null, 0);
    await karma.createKarma("g1", "m1", "u1", "u4", "down", -1, null, 0);
    expect(await karma.getKarmaByMessageAndEmoji("g1", "m1", "up")).toEqual([
      { fromUserId: "u2" },
      { fromUserId: "u3" }
    ]);
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
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("UNIQUE"));
    await deleteServer("g1");
    expect(databaseService.getDb().prepare("SELECT COUNT(*) AS n FROM Server").get().n).toBe(0);
  });
});
