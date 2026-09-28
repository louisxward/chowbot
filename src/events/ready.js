const { Events } = require("discord.js");
const logger = require("logger");
const { onReady } = require("services/readyService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info({ user: client.user.tag }, "ready - logged in");
    await onReady(client);
  }
};
