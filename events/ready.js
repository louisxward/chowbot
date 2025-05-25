const { Events, ActivityType } = require("discord.js");
const logger = require("logger");
const cron = require("node-cron");

const { clearSetChannels } = require("services/messageClearer");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    await client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
    // Create Scheduled timer for deleting all messages in set channels at 05:00 UTC daily
    cron.schedule(
      //"0 5 * * *",
      "* * * * *",
      () => {
        clearSetChannels(client);
      },
      {
        timezone: "UTC"
      }
    );
  }
};
