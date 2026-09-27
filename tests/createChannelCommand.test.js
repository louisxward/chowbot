jest.mock("repositories/serverChannel", () => ({
  getChannels: jest.fn(),
  addChannel: jest.fn(),
  removeChannel: jest.fn()
}));

const { addChannel, removeChannel, getChannels } = require("repositories/serverChannel");
const { createChannelCommand } = require("utils/createChannelCommand");

const command = createChannelCommand({ name: "clearchannel", description: "Test channels", type: "clearChannels" });

function makeInteraction(sub, { channel, channelId } = {}) {
  return {
    guildId: "g1",
    deferred: true,
    options: {
      getSubcommand: () => sub,
      getChannel: () => channel,
      getString: () => channelId
    },
    deferReply: jest.fn(),
    editReply: jest.fn(),
    reply: jest.fn()
  };
}

beforeEach(() => jest.clearAllMocks());

test("is limited to servers", () => {
  expect(command.data.toJSON().contexts).toEqual([0]);
});

test("add saves a channel from this server", async () => {
  const interaction = makeInteraction("add", { channel: { id: "c1", guildId: "g1" } });
  await command.execute(interaction);
  expect(addChannel).toHaveBeenCalledWith("g1", "clearChannels", "c1");
  expect(interaction.editReply).toHaveBeenCalledWith({ content: "Channel added" });
});

test("add rejects a channel from another server", async () => {
  const interaction = makeInteraction("add", { channel: { id: "c9", guildId: "g2" } });
  await command.execute(interaction);
  expect(addChannel).not.toHaveBeenCalled();
  expect(interaction.editReply).toHaveBeenCalledWith({ content: "Failed: Channel must be in this server" });
});

test("remove reports the repository error", async () => {
  removeChannel.mockRejectedValue(new Error("Channel isn't in the list"));
  const interaction = makeInteraction("remove", { channelId: "c1" });
  await command.execute(interaction);
  expect(interaction.editReply).toHaveBeenCalledWith({ content: "Failed: Channel isn't in the list" });
});

test("list shows channel mentions", async () => {
  getChannels.mockResolvedValue(["c1", "c2"]);
  const interaction = makeInteraction("list");
  await command.execute(interaction);
  expect(interaction.editReply).toHaveBeenCalledWith({ content: "<#c1>\n<#c2>" });
});
