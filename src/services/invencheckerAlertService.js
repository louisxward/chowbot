const { EmbedBuilder } = require("discord.js");
const logger = require("logger");
const { getAllUsers } = require("repositories/invencheckerUser");
const { getUserAlerts, resolveAllAlerts } = require("services/invencheckerService");
const { formatPrice } = require("utils/format");

const ALERT_COLOUR = 0xffa500;

// DMs each registered user their new price alerts. Alerts are only resolved once the DM is
// delivered, so a failed DM is retried on the next run. One user's failure doesn't stop the rest.
async function sendInvencheckerAlerts(client) {
  for (const { discordId, uid } of await getAllUsers()) {
    try {
      const alerts = await getUserAlerts(uid);
      if (!alerts.length) continue;
      const embed = new EmbedBuilder()
        .setTitle("Price Alert")
        .setColor(ALERT_COLOUR)
        .setDescription(alerts.map(formatAlert).join("\n").slice(0, 4096))
        .setTimestamp();
      const user = await client.users.fetch(discordId);
      await user.send({ embeds: [embed] });
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
