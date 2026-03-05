const { ActivityType } = require("discord.js");
const cron = require("node-cron");
const logger = require("logger");

const { scheduledClearer } = require("services/messageClearer");
const { persistKarmaWeeklyLeaderboard, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");

const STATUSES = [
  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "Raging w/ Charlie", type: ActivityType.Watching },

  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "yo momma", type: ActivityType.Playing },

  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "Gaming w/ Henry", type: ActivityType.Watching },

  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "DrankDrankDrank By Nettspend", type: ActivityType.Listening },
  { name: "Twerkin w/ Tec?", type: ActivityType.Playing }
];

function schedule(expression, name, fn) {
  cron.schedule(expression, async () => {
    try {
      logger.info(`scheduled - ${name}`);
      await fn();
    } catch (error) {
      logger.error({ err: error }, `scheduled - ${name} failed`);
    }
  }, { timezone: "UTC" });
}

async function validateEmojis(client) {
  const appEmojis = await client.application.emojis.fetch();
  for (const [varName, emojiId] of Object.entries({
    EMOJI_UPVOTE_ID: process.env.EMOJI_UPVOTE_ID,
    EMOJI_DOWNVOTE_ID: process.env.EMOJI_DOWNVOTE_ID
  })) {
    const emoji = appEmojis.get(emojiId);
    if (!emoji) {
      logger.warn(`startup - emoji not found for ${varName} (id: ${emojiId})`);
    } else {
      logger.info(`startup - emoji ok: ${varName} -> ${emoji.name}`);
    }
  }
}

async function readyup(client) {
  await validateEmojis(client);

  // Set initial status
  let currentIndex = 0;
  await client.user.setActivity(STATUSES[currentIndex].name, { type: STATUSES[currentIndex].type });
  currentIndex = 1;

  schedule("0 0 * * *", "statusUpdate", async () => {
    const status = STATUSES[currentIndex];
    await client.user.setActivity(status.name, { type: status.type });
    currentIndex = (currentIndex + 1) % STATUSES.length;
  });

  schedule("0 5 * * *", "scheduledClearer", () => scheduledClearer(client));

  schedule("0 21 * * 0", "sendKarmaWeeklyLeaderboard", () => sendKarmaWeeklyLeaderboard(client));
  schedule("0 21 * * 0", "persistKarmaWeeklyLeaderboard", () => persistKarmaWeeklyLeaderboard());
}

module.exports = { readyup };
