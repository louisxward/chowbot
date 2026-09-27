jest.mock("services/applicationConfigService", () => ({ getAppConfig: jest.fn() }));

const { ActivityType } = require("discord.js");
const { getAppConfig } = require("services/applicationConfigService");
const { rotateStatus } = require("services/statusService");

const client = { user: { setActivity: jest.fn() } };

test("cycles through the configured statuses in order", async () => {
  getAppConfig.mockResolvedValue({
    statuses: [
      { name: "one", type: "Watching" },
      { name: "two", type: "Playing" }
    ]
  });
  await rotateStatus(client);
  await rotateStatus(client);
  await rotateStatus(client);
  expect(client.user.setActivity.mock.calls).toEqual([
    ["one", { type: ActivityType.Watching }],
    ["two", { type: ActivityType.Playing }],
    ["one", { type: ActivityType.Watching }]
  ]);
});

test("does nothing when no statuses are configured", async () => {
  client.user.setActivity.mockClear();
  getAppConfig.mockResolvedValue({});
  await rotateStatus(client);
  expect(client.user.setActivity).not.toHaveBeenCalled();
});
