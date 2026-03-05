const { Events } = require("discord.js");
const logger = require("logger");

const { readyup } = require("services/readyService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`ready - ${client.user.tag}`);
    await readyup(client);
  }
};
