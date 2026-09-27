const { Events } = require("discord.js");
const { handleMessage } = require("services/messageService");

module.exports = {
  name: Events.MessageUpdate,
  async execute(_oldMessage, newMessage) {
    await handleMessage(newMessage, true);
  }
};
