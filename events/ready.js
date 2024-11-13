const { Events, ActivityType } = require("discord.js");
const logger = require("../logger.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[INFO] ${client.user.tag} INITIALISED`);
    logger.info("MessageCreate");
    client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
  },
};
