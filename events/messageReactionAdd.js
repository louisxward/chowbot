const { Events } = require("discord.js");
const { karmaCalculator } = require("services/karmaStorage");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    await karmaCalculator(reaction, user, true);
  }
};
