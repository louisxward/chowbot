const { Events } = require("discord.js");
const { karmaCounter } = require("../services/karmaCounter.js");
const logger = require("logger");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    logger.info("event - MessageReactionAdd");
    await karmaCounter(reaction, user, true);
  },
};
