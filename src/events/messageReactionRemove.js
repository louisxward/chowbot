const { Events } = require("discord.js");
const { handleReaction } = require("services/karmaService");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    await handleReaction(reaction, user, false);
  }
};
