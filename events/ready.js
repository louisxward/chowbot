const { Events, ActivityType } = require("discord.js");
const logger = require("logger");
const cron = require("node-cron");

const { scheduledClearer } = require("services/messageClearer");

const { persistKarmaWeeklyLeaderboard, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    // Init
    logger.info(`${client.user.tag} INITIALISED`);
    await client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });

    // Scheduled Timers - ToDo - Move this to somewhere else
    //// Daily Clearer - 05:00 UTC
    cron.schedule(
      "0 5 * * *",
      async () => {
        try {
          logger.info("scheduled - scheduledClearer");
          await scheduledClearer(client);
        } catch (error) {
          logger.error(error);
        }
      },
      { timezone: "UTC" }
    );
    //// Send Weekly Leaderboard - Sunday 21:00 UTC
    cron.schedule(
      "0 21 * * 0",
      async () => {
        try {
          logger.info("scheduled - sendKarmaWeeklyLeaderboard");
          await sendKarmaWeeklyLeaderboard(client);
        } catch (error) {
          logger.error(error);
        }
      },
      { timezone: "UTC" }
    );
    //// Persist Weekly Leaderboard - Sunday 23:59 UTC
    cron.schedule(
      "59 23 * * 0",
      async () => {
        try {
          logger.info("scheduled - persistKarmaWeeklyLeaderboard");
          await persistKarmaWeeklyLeaderboard();
        } catch (error) {
          logger.error(error);
        }
      },
      { timezone: "UTC" }
    );
  }
};
