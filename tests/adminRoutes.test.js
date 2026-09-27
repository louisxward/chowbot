let mockAdminToken;

jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("config", () => ({
  get ADMIN_TOKEN() {
    return mockAdminToken;
  }
}));
jest.mock("services/usernameCacheService", () => ({ clearUsernameCache: jest.fn() }));
jest.mock("services/applicationConfigService", () => ({ reloadAppConfig: jest.fn(), validateEmojis: jest.fn() }));
jest.mock("services/leaderboardService", () => ({
  sendKarmaWeeklyLeaderboard: jest.fn().mockResolvedValue(),
  persistKarmaWeeklyLeaderboard: jest.fn().mockResolvedValue()
}));
jest.mock("services/commandService", () => ({ deployCommands: jest.fn() }));
jest.mock("services/healthService", () => ({ getStatus: jest.fn() }));

const { clearUsernameCache } = require("services/usernameCacheService");
const { deployCommands } = require("services/commandService");
const { getStatus } = require("services/healthService");
const { createApp } = require("app");

let server;
let baseUrl;

beforeAll(async () => {
  server = createApp({}).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminToken = "s3cret";
});

const post = (path, { token, body } = {}) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body ?? {})
  });

describe("admin auth", () => {
  test("rejects a request with no token", async () => {
    const res = await post("/admin/clearstate");
    expect(res.status).toBe(401);
    expect(clearUsernameCache).not.toHaveBeenCalled();
  });

  test("rejects a wrong token", async () => {
    expect((await post("/admin/clearstate", { token: "nope" })).status).toBe(401);
    expect(clearUsernameCache).not.toHaveBeenCalled();
  });

  test("accepts the right token", async () => {
    const res = await post("/admin/clearstate", { token: "s3cret" });
    expect(res.status).toBe(200);
    expect(clearUsernameCache).toHaveBeenCalled();
  });

  test("is disabled when ADMIN_TOKEN is not set", async () => {
    mockAdminToken = undefined;
    expect((await post("/admin/clearstate", { token: "anything" })).status).toBe(503);
    expect(clearUsernameCache).not.toHaveBeenCalled();
  });
});

describe("POST /admin/deploycommands", () => {
  test("returns how many commands were deployed", async () => {
    deployCommands.mockResolvedValue(8);
    const res = await post("/admin/deploycommands", { token: "s3cret", body: { serverId: "g1" } });
    expect(await res.json()).toEqual({ ok: true, serverId: "g1", count: 8 });
    expect(deployCommands).toHaveBeenCalledWith("g1");
  });

  test("returns 502 when Discord rejects the deploy", async () => {
    deployCommands.mockRejectedValue(new Error("401: Unauthorized"));
    const res = await post("/admin/deploycommands", { token: "s3cret" });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain("401: Unauthorized");
  });
});

describe("GET /health", () => {
  test("200 when healthy, with no token needed", async () => {
    getStatus.mockResolvedValue({ status: "ok" });
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
  });

  test("503 when degraded", async () => {
    getStatus.mockResolvedValue({ status: "degraded" });
    expect((await fetch(`${baseUrl}/health`)).status).toBe(503);
  });
});
