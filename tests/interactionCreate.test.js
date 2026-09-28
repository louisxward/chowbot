jest.mock("logger", () => ({ debug: jest.fn(), info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const { execute } = require("events/interactionCreate");

function makeInteraction({ type, commandName, customId, commands }) {
  return {
    commandName,
    customId,
    guildId: "g1",
    user: { id: "u1" },
    replied: false,
    deferred: false,
    isChatInputCommand: () => type === "command",
    isButton: () => type === "button",
    client: { commands: new Map(Object.entries(commands)) },
    reply: jest.fn(),
    followUp: jest.fn()
  };
}

test("runs a slash command's execute", async () => {
  const command = { execute: jest.fn() };
  const interaction = makeInteraction({ type: "command", commandName: "ping", commands: { ping: command } });
  await execute(interaction);
  expect(command.execute).toHaveBeenCalledWith(interaction);
});

test("routes a button to its command's handleButton with the id's arguments", async () => {
  const command = { execute: jest.fn(), handleButton: jest.fn() };
  const interaction = makeInteraction({
    type: "button",
    customId: "invenchecker:prices:2:30",
    commands: { invenchecker: command }
  });
  await execute(interaction);
  expect(command.handleButton).toHaveBeenCalledWith(interaction, ["prices", "2", "30"]);
});

test("ignores a button for a command without handleButton", async () => {
  const command = { execute: jest.fn() };
  const interaction = makeInteraction({ type: "button", customId: "health:1", commands: { health: command } });
  await expect(execute(interaction)).resolves.toBeUndefined();
  expect(interaction.reply).not.toHaveBeenCalled();
});

test("replies with an error when a button handler throws", async () => {
  const command = { execute: jest.fn(), handleButton: jest.fn().mockRejectedValue(new Error("boom")) };
  const interaction = makeInteraction({
    type: "button",
    customId: "leaderboard:1",
    commands: { leaderboard: command }
  });
  await execute(interaction);
  expect(interaction.reply).toHaveBeenCalledWith(
    expect.objectContaining({ content: expect.stringContaining("error") })
  );
});
