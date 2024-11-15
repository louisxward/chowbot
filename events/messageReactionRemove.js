const { Events } = require("discord.js");
const { karmaCounter } = require("services/karmaCounter");
const logger = require("logger");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    logger.info("event - MessageReactionRemove");
    await karmaCounter(reaction, user, false);
  },
};
