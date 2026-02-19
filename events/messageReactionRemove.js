const { Events } = require("discord.js");
const { handleEvent } = require("services/karmaService");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    await handleEvent(reaction, user, false);
  }
};
