const { Events } = require("discord.js");
const { handleMessageEvent } = require("services/contentDetector");
require("dotenv").config();

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    await handleMessageEvent(newMessage, true);
  }
};
