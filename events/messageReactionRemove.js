const { Events } = require("discord.js");
const logger = require("logger");
const { karmaCalculator } = require("services/karmaStorage");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    logger.info("event - MessageReactionRemove");
    await karmaCalculator(reaction, user, false);
  }
};
