const { Events, ActivityType } = require("discord.js");
const logger = require("logger");
const cron = require("node-cron");

const { scheduledClearer } = require("services/messageClearer");

const { persistKarmaWeeklyLeaderboard, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    // Scheduled Timers - ToDo - Move this to somewhere else
    // Statuses - Hourly
    const statuses = [
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "yo momma", type: ActivityType.Playing },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
      { name: "Gaming w/ Henry", type: ActivityType.Playing }
    ];
    let currentIndex = 0;
    cron.schedule(
      "0 0 * * *",
      async () => {
        try {
          const status = statuses[currentIndex];
          await client.user.setActivity(status.name, { type: status.type });
          currentIndex = (currentIndex + 1) % statuses.length;
        } catch (error) {
          logger.error(error);
        }
      },
      { timezone: "UTC" }
    );
    await client.user.setActivity(statuses[0].name, { type: statuses[0].type });
    currentIndex = 1;
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
    //// Send/Persist Weekly Leaderboard - Sunday 21:00 UTC
    cron.schedule(
      "0 21 * * 0",
      async () => {
        try {
          logger.info("scheduled - sendKarmaWeeklyLeaderboard");
          await sendKarmaWeeklyLeaderboard(client);
        } catch (error) {
          logger.error(error);
        }
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
