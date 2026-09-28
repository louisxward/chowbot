jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock("repositories/invencheckerUser", () => ({ getUid: jest.fn(), setUid: jest.fn() }));
jest.mock("services/invencheckerService", () => ({
  getUserAlerts: jest.fn(),
  getAccountSummary: jest.fn(),
  getAccountProgress: jest.fn(),
  getAccountPrices: jest.fn()
}));

const { MessageFlags } = require("discord.js");
const { getUid } = require("repositories/invencheckerUser");
const { getUserAlerts, getAccountSummary, getAccountPrices } = require("services/invencheckerService");
const command = require("commands/invenchecker/invenchecker");

const alert = (i) => ({ market_hash_name: `Item ${i} ${"x".repeat(40)}`, spike_pct: 10, price_at_alert: 1.5 });

function makeInteraction({ group, sub, integers = {}, strings = {} }) {
  return {
    user: { id: "d1" },
    deferred: false,
    options: {
      getSubcommandGroup: () => group,
      getSubcommand: () => sub,
      getInteger: (name) => integers[name] ?? null,
      getString: (name) => strings[name] ?? null
    },
    reply: jest.fn(),
    deferReply: jest.fn(function () {
      this.deferred = true;
    }),
    deferUpdate: jest.fn(),
    editReply: jest.fn(),
    followUp: jest.fn()
  };
}

const buttonIds = (reply) => reply.components[0].toJSON().components.map((button) => button.custom_id);

beforeEach(() => {
  jest.clearAllMocks();
  getUid.mockResolvedValue("uid1");
});

test("alerts list pages long lists with buttons instead of cutting them off", async () => {
  getUserAlerts.mockResolvedValue(Array.from({ length: 150 }, (_, i) => alert(i)));
  const interaction = makeInteraction({ group: "alerts", sub: "list" });
  await command.execute(interaction);
  const reply = interaction.editReply.mock.calls[0][0];
  expect(reply.embeds[0].data.description.length).toBeLessThanOrEqual(4096);
  expect(buttonIds(reply)).toEqual([
    "invenchecker:alerts:-1:",
    "invenchecker:alerts:0::current",
    "invenchecker:alerts:1:"
  ]);
});

test("a page button loads that page for the user who clicked", async () => {
  getUserAlerts.mockResolvedValue(Array.from({ length: 150 }, (_, i) => alert(i)));
  const interaction = makeInteraction({});
  await command.handleButton(interaction, ["alerts", "1", ""]);
  expect(interaction.deferUpdate).toHaveBeenCalled();
  const reply = interaction.editReply.mock.calls[0][0];
  expect(reply.embeds[0].data.description).toContain("Item ");
  expect(reply.components[0].toJSON().components[1].label).toMatch(/^2\//);
});

test("a page button asks users without an account to register", async () => {
  getUid.mockResolvedValue(null);
  const interaction = makeInteraction({});
  await command.handleButton(interaction, ["alerts", "1", ""]);
  expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: MessageFlags.Ephemeral }));
  expect(interaction.deferUpdate).not.toHaveBeenCalled();
});

test("summary splits a long section into continued fields rather than cutting mid-line", async () => {
  const items = Array.from({ length: 80 }, (_, i) => ({ market_hash_name: `Item ${i}`, price: { lowest_price: i } }));
  getAccountSummary.mockResolvedValue({ steam64ids: { 76561198000000000: items }, customItems: [] });
  const interaction = makeInteraction({ group: "view", sub: "summary" });
  await command.execute(interaction);
  const fields = interaction.editReply.mock.calls[0][0].embeds[0].data.fields;
  expect(fields[0].name).toBe("76561198000000000");
  expect(fields[1].name).toBe("76561198000000000 (cont.)");
  expect(fields.every((field) => field.value.length <= 1024)).toBe(true);
  const lines = fields.flatMap((field) => field.value.split("\n"));
  expect(lines).toHaveLength(80);
  expect(lines.every((line) => /^`Item \d+` — £\d+\.\d\d$/.test(line))).toBe(true);
});

test("prices keeps the days in the page button ids", async () => {
  const prices = Object.fromEntries(
    Array.from({ length: 30 }, (_, i) => [
      `Item ${i}`,
      [{ captured_at: 1_700_000_000, lowest_price: 1, median_price: 2 }]
    ])
  );
  getAccountPrices.mockResolvedValue(prices);
  const interaction = makeInteraction({ group: "view", sub: "prices", integers: { days: 30 } });
  await command.execute(interaction);
  expect(buttonIds(interaction.editReply.mock.calls[0][0])[2]).toBe("invenchecker:prices:1:30");
});

test("empty views keep their messages", async () => {
  getUserAlerts.mockResolvedValue([]);
  const interaction = makeInteraction({ group: "alerts", sub: "list" });
  await command.execute(interaction);
  expect(interaction.editReply).toHaveBeenCalledWith({ content: "No unresolved alerts.", embeds: [], components: [] });
});
