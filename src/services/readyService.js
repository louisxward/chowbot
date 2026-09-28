const logger = require("logger");
const { clearAllChannels } = require("services/clearerService");
const { sendInvencheckerAlerts } = require("services/invencheckerAlertService");
const { validateKarmaEmojis, clearKarmaEmojis } = require("services/karmaEmojiService");
const { persistKarmaWeeklyLeaderboard, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const { schedule } = require("services/schedulerService");
const { rotateStatus } = require("services/statusService");

// Runs once the Discord client is ready. Jobs are scheduled first, so a failure in the later
// steps can't stop them from running.
async function onReady(client) {
  schedule("0 0 * * *", "statusRotation", () => rotateStatus(client));
  schedule("0 5 * * *", "clearChannels", () => clearAllChannels(client));
  schedule("0 21 * * 0", "sendKarmaWeeklyLeaderboard", () => sendKarmaWeeklyLeaderboard(client));
  schedule("1 21 * * 0", "persistKarmaWeeklyLeaderboard", () => persistKarmaWeeklyLeaderboard());
  schedule("*/1 * * * *", "invencheckerAlerts", () => sendInvencheckerAlerts(client));

  try {
    await validateKarmaEmojis(client);
  } catch (err) {
    clearKarmaEmojis();
    logger.error({ err }, "ready - emoji validation failed, karma reactions disabled");
  }

  try {
    await rotateStatus(client);
  } catch (err) {
    logger.error({ err }, "ready - failed to set initial status");
  }
}

module.exports = { onReady };
