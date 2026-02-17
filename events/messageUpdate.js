const { Events } = require("discord.js");
const logger = require("logger");
const { handleEvent } = require("services/contentDetector");
require("dotenv").config();

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    logger.info("!!message update");
    await handleEvent(newMessage, true);
  }
};
