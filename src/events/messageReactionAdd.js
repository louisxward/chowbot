const { Events } = require("discord.js");
const { handleEvent } = require("services/karmaService");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    await handleEvent(reaction, user, true);
  }
};
