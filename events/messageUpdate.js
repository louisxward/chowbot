const { Events } = require("discord.js");
const { handleMessageEvent } = require("services/contentDetector");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    await handleMessageEvent(newMessage, true);
  }
};
