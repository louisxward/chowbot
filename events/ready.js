const { Events, ActivityType } = require("discord.js");
const logger = require("logger");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
  },
};
