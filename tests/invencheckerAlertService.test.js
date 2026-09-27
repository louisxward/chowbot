jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/invencheckerUser", () => ({ getAllUsers: jest.fn() }));
jest.mock("services/invencheckerService", () => ({ getUserAlerts: jest.fn(), resolveAllAlerts: jest.fn() }));

const { getAllUsers } = require("repositories/invencheckerUser");
const { getUserAlerts, resolveAllAlerts } = require("services/invencheckerService");
const { sendInvencheckerAlerts } = require("services/invencheckerAlertService");

const alert = { market_hash_name: "AK-47 | Redline", spike_pct: 12.345, price_at_alert: 9.5 };

function makeClient(sendByUser) {
  return {
    users: {
      fetch: jest.fn(async (id) => ({ send: sendByUser[id] }))
    }
  };
}

beforeEach(() => jest.clearAllMocks());

test("DMs the alerts in £ and resolves them once delivered", async () => {
  getAllUsers.mockResolvedValue([{ discordId: "d1", uid: "u1" }]);
  getUserAlerts.mockResolvedValue([alert]);
  const send = jest.fn();
  await sendInvencheckerAlerts(makeClient({ d1: send }));
  const description = send.mock.calls[0][0].embeds[0].data.description;
  expect(description).toBe("**AK-47 | Redline** — +12.3% @ £9.50");
  expect(resolveAllAlerts).toHaveBeenCalledWith("u1");
});

test("keeps alerts unresolved when the DM fails, and carries on with other users", async () => {
  getAllUsers.mockResolvedValue([
    { discordId: "closedDms", uid: "u1" },
    { discordId: "d2", uid: "u2" }
  ]);
  getUserAlerts.mockResolvedValue([alert]);
  const send = jest.fn();
  await sendInvencheckerAlerts(
    makeClient({ closedDms: jest.fn().mockRejectedValue(new Error("Cannot send messages to this user")), d2: send })
  );
  expect(resolveAllAlerts).not.toHaveBeenCalledWith("u1");
  expect(resolveAllAlerts).toHaveBeenCalledWith("u2");
  expect(send).toHaveBeenCalled();
});

test("carries on when invenchecker fails for one user", async () => {
  getAllUsers.mockResolvedValue([
    { discordId: "d1", uid: "u1" },
    { discordId: "d2", uid: "u2" }
  ]);
  getUserAlerts.mockRejectedValueOnce(new Error("timeout")).mockResolvedValueOnce([alert]);
  const send = jest.fn();
  await sendInvencheckerAlerts(makeClient({ d1: jest.fn(), d2: send }));
  expect(send).toHaveBeenCalled();
  expect(resolveAllAlerts).toHaveBeenCalledTimes(1);
});

test("does nothing for users with no alerts", async () => {
  getAllUsers.mockResolvedValue([{ discordId: "d1", uid: "u1" }]);
  getUserAlerts.mockResolvedValue([]);
  const client = makeClient({});
  await sendInvencheckerAlerts(client);
  expect(client.users.fetch).not.toHaveBeenCalled();
  expect(resolveAllAlerts).not.toHaveBeenCalled();
});

test("splits a long alert list over several DMs and resolves once all are sent", async () => {
  getAllUsers.mockResolvedValue([{ discordId: "d1", uid: "u1" }]);
  getUserAlerts.mockResolvedValue(
    Array.from({ length: 150 }, (_, i) => ({ ...alert, market_hash_name: `Item ${i} ${"x".repeat(40)}` }))
  );
  const send = jest.fn();
  await sendInvencheckerAlerts(makeClient({ d1: send }));
  expect(send.mock.calls.length).toBeGreaterThan(1);
  const titles = send.mock.calls.map(([message]) => message.embeds[0].data.title);
  expect(titles[0]).toBe(`Price Alert (1/${titles.length})`);
  const all = send.mock.calls.map(([message]) => message.embeds[0].data.description).join("\n");
  expect(all.split("\n")).toHaveLength(150);
  expect(resolveAllAlerts).toHaveBeenCalledTimes(1);
});

test("doesn't resolve if a later DM in the batch fails", async () => {
  getAllUsers.mockResolvedValue([{ discordId: "d1", uid: "u1" }]);
  getUserAlerts.mockResolvedValue(
    Array.from({ length: 150 }, (_, i) => ({ ...alert, market_hash_name: `Item ${i} ${"x".repeat(40)}` }))
  );
  const send = jest.fn().mockResolvedValueOnce().mockRejectedValueOnce(new Error("rate limited"));
  await sendInvencheckerAlerts(makeClient({ d1: send }));
  expect(resolveAllAlerts).not.toHaveBeenCalled();
});
