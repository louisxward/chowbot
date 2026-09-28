const { Events } = require("discord.js");
const { handleMessage } = require("services/messageService");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    await handleMessage(message, false);
  }
};
