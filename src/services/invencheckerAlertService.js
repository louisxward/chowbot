const { EmbedBuilder } = require("discord.js");
const logger = require("logger");
const { getAllUsers } = require("repositories/invencheckerUser");
const { getUserAlerts, resolveAllAlerts } = require("services/invencheckerService");
const { formatPrice } = require("utils/format");
const { EMBED_DESCRIPTION_LIMIT, chunkLines } = require("utils/pagination");

const ALERT_COLOUR = 0xffa500;

// DMs each registered user their new price alerts, split over several messages if they don't fit
// in one embed. Alerts are only resolved once every message is delivered, so a failed DM is
// retried on the next run. One user's failure doesn't stop the rest.
async function sendInvencheckerAlerts(client) {
  for (const { discordId, uid } of await getAllUsers()) {
    try {
      const alerts = await getUserAlerts(uid);
      if (!alerts.length) continue;
      const user = await client.users.fetch(discordId);
      const chunks = chunkLines(alerts.map(formatAlert), EMBED_DESCRIPTION_LIMIT);
      for (const [i, description] of chunks.entries()) {
        const title = chunks.length > 1 ? `Price Alert (${i + 1}/${chunks.length})` : "Price Alert";
        const embed = new EmbedBuilder()
          .setTitle(title)
          .setColor(ALERT_COLOUR)
          .setDescription(description)
          .setTimestamp();
        await user.send({ embeds: [embed] });
      }
      await resolveAllAlerts(uid);
      logger.info({ discordId, count: alerts.length }, "invenchecker - alerts sent");
    } catch (err) {
      logger.warn({ err, discordId }, "invenchecker - failed to send alerts, will retry next run");
    }
  }
}

function formatAlert(alert) {
  return `**${alert.market_hash_name}** — +${alert.spike_pct.toFixed(1)}% @ ${formatPrice(alert.price_at_alert)}`;
}

module.exports = { sendInvencheckerAlerts, formatAlert, ALERT_COLOUR };
