const { Events, ActivityType } = require("discord.js");
const logger = require("logger");
const cron = require("node-cron");

const { scheduledClearer } = require("services/messageClearer");

const { persistKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    await client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
    //todo - check what servers the bot has access too, incase someone invited or delete whilst down

    // Scheduled Timers
    // Daily Clearer - 05:00 UTC
    cron.schedule(
      //"0 5 * * *",
      "9 19 * * 0",
      async () => {
        try {
          logger.info("Starting scheduled message clearance...");
          await scheduledClearer(client);
        } catch (error) {
          logger.error("Error in scheduledClearer:", error);
        }
      },
      { timezone: "UTC" }
    );

    // Weekly Leaderboard - Sunday 19:00 UTC
    cron.schedule(
      //"0 19 * * 0",
      "5 19 * * 0",
      async () => {
        try {
          logger.info("Persisting weekly karma...");
          await persistKarmaWeeklyLeaderboard();
        } catch (error) {
          logger.error("Error in persistKarmaWeeklyLeaderboard:", error);
        }
      },
      { timezone: "UTC" }
    );
  }
};
