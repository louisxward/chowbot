const { Events, ActivityType } = require("discord.js");
const logger = require("logger");
const cron = require("node-cron");

const { scheduledClearer } = require("services/messageClearer");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    await client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
    // Create Scheduled timer for deleting all messages in set channels at 05:00 UTC daily
    // todo move to index.js
    cron.schedule(
      "0 5 * * *",
      () => {
        scheduledClearer(client);
      },
      {
        timezone: "UTC"
      }
    );
  }
};
