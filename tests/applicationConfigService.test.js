const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

let mockConfigPath;

jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("config", () => ({
  get APPLICATION_CONFIG_PATH() {
    return mockConfigPath;
  }
}));

let tmpDir;
let service;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "chowbot-config-"));
  mockConfigPath = path.join(tmpDir, "applicationConfig.json");
  jest.resetModules();
  service = require("services/applicationConfigService");
});

afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

const writeConfig = (config) => fs.writeFileSync(mockConfigPath, JSON.stringify(config));
const clientWithEmojis = (ids) => ({
  application: { emojis: { fetch: async () => new Map(ids.map((id) => [id, { name: `emoji_${id}` }])) } }
});

describe("getAppConfig", () => {
  test("is empty when the file doesn't exist", async () => {
    expect(await service.getAppConfig()).toEqual({});
  });

  test("reads the file once and caches it until reloaded", async () => {
    writeConfig({ domainList: ["a.com"] });
    expect(await service.getAppConfig()).toEqual({ domainList: ["a.com"] });
    writeConfig({ domainList: ["b.com"] });
    expect(await service.getAppConfig()).toEqual({ domainList: ["a.com"] });
    expect(await service.reloadAppConfig()).toEqual({ domainList: ["b.com"] });
    expect(await service.getAppConfig()).toEqual({ domainList: ["b.com"] });
  });

  test("throws on invalid JSON", async () => {
    fs.writeFileSync(mockConfigPath, "{ not json");
    await expect(service.getAppConfig()).rejects.toThrow(SyntaxError);
  });
});

describe("validateEmojis", () => {
  test("enables karma reactions when both emojis exist", async () => {
    writeConfig({ emojiUpvoteId: "up", emojiDownvoteId: "down" });
    await service.validateEmojis(clientWithEmojis(["up", "down"]));
    expect(service.areEmojisValid()).toBe(true);
  });

  test("disables karma reactions when an emoji is missing from the app", async () => {
    writeConfig({ emojiUpvoteId: "up", emojiDownvoteId: "down" });
    await service.validateEmojis(clientWithEmojis(["up"]));
    expect(service.areEmojisValid()).toBe(false);
  });

  test("disables karma reactions when an emoji id isn't configured", async () => {
    writeConfig({ emojiUpvoteId: "up" });
    await service.validateEmojis(clientWithEmojis(["up", "down"]));
    expect(service.areEmojisValid()).toBe(false);
  });
});
