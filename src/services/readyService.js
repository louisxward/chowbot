const { ActivityType, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const logger = require("logger");

const { scheduledClearer } = require("services/messageClearer");
const { persistKarmaWeeklyLeaderboard, sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const { getAppConfig, setEmojisValid } = require("services/applicationConfigService");
const { getAllUsers } = require("services/invencheckerStorage");
const { getUserAlerts, resolveAllAlerts } = require("services/invencheckerService");

function schedule(expression, name, fn) {
  cron.schedule(
    expression,
    async () => {
      try {
        logger.info(`scheduled - ${name}`);
        await fn();
      } catch (error) {
        logger.error({ err: error }, `scheduled - ${name} failed`);
      }
    },
    { timezone: "UTC" }
  );
}

async function validateEmojis(client) {
  const appEmojis = await client.application.emojis.fetch();
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  let allValid = true;
  for (const [varName, emojiId] of Object.entries({ emojiUpvoteId, emojiDownvoteId })) {
    if (!emojiId) {
      logger.warn(`post - ${varName} is missing from applicationConfig`);
      allValid = false;
      continue;
    }
    const emoji = appEmojis.get(emojiId);
    if (!emoji) {
      logger.warn(`post - emoji not found for ${varName} (id: ${emojiId})`);
      allValid = false;
    } else {
      logger.info(`post - emoji ok: ${varName} -> ${emoji.name}`);
    }
  }
  setEmojisValid(allValid);
}

function mapStatuses(statuses) {
  return statuses.map(({ name, type }) => ({ name, type: ActivityType[type] }));
}

async function readyup(client) {
  await validateEmojis(client);

  // Set initial status
  const { statuses: initialStatuses = [] } = await getAppConfig();
  const initialMapped = mapStatuses(initialStatuses);
  let currentIndex = 0;
  if (initialMapped.length > 0) {
    await client.user.setActivity(initialMapped[currentIndex].name, { type: initialMapped[currentIndex].type });
    currentIndex = 1;
  }

  schedule("0 0 * * *", "statusUpdate", async () => {
    const { statuses = [] } = await getAppConfig();
    const mapped = mapStatuses(statuses);
    if (mapped.length === 0) return;
    const status = mapped[currentIndex % mapped.length];
    await client.user.setActivity(status.name, { type: status.type });
    currentIndex = (currentIndex + 1) % mapped.length;
  });

  schedule("0 5 * * *", "scheduledClearer", () => scheduledClearer(client));

  schedule("0 21 * * 0", "sendKarmaWeeklyLeaderboard", () => sendKarmaWeeklyLeaderboard(client));
  schedule("1 21 * * 0", "persistKarmaWeeklyLeaderboard", () => persistKarmaWeeklyLeaderboard());

  schedule("*/5 * * * *", "invencheckerAlerts", async () => {
    const users = await getAllUsers();
    for (const { discordId, uid } of users) {
      const alerts = await getUserAlerts(uid);
      if (!alerts.length) continue;
      const embed = new EmbedBuilder()
        .setTitle("Price Alert")
        .setColor(0xffa500)
        .setDescription(
          alerts
            .map((a) => `**${a.market_hash_name}** — +${a.spike_pct.toFixed(1)}% @ $${a.price_at_alert.toFixed(2)}`)
            .join("\n")
        )
        .setTimestamp();
      try {
        const user = await client.users.fetch(discordId);
        await user.send({ embeds: [embed] });
      } catch (err) {
        logger.warn({ err, discordId }, "invencheckerAlerts - failed to DM user");
      }
      //await resolveAllAlerts(uid);
    }
  });
}

module.exports = { readyup, validateEmojis };
