const { Events } = require("discord.js");
const { handleReaction } = require("services/karmaService");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    await handleReaction(reaction, user, true);
  }
};
