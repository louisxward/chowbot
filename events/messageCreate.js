const { Events } = require("discord.js");
const { handleMessageEvent } = require("services/contentDetector");
require("dotenv").config();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    await handleMessageEvent(message, false);
  }
};
