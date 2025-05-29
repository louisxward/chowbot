const { Events } = require("discord.js");
const logger = require("logger");
const { karmaCalculator } = require("services/karmaStorage");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    await karmaCalculator(reaction, user, true);
  }
};
