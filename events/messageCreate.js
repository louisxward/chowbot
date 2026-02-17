const { Events } = require("discord.js");
const logger = require("logger");
const { handleEvent } = require("services/contentDetector");
require("dotenv").config();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    logger.info("!!message create");
    await handleEvent(message, false);
  }
};
