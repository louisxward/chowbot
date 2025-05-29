const { Events } = require("discord.js");
const { karmaCalculator } = require("services/karmaStorage");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    await karmaCalculator(reaction, user, false);
  }
};
