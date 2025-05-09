const { Events } = require("discord.js");
const logger = require("logger");
const karmaCounter = require("services/karmaCounter");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    logger.info("event - MessageReactionRemove");
    await karmaCounter(reaction, user, false);
  }
};
