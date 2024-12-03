const { Events } = require("discord.js");
const logger = require("logger");
const karmaCounter = require("services/karmaCounter");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    logger.info("event - MessageReactionAdd");
    await karmaCounter(reaction, user, true);
  }
};
