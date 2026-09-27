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
