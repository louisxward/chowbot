const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  InteractionContextType
} = require("discord.js");
const { getStatus } = require("services/healthService");

const OK_COLOUR = 0x57f287;
const DEGRADED_COLOUR = 0xed4245;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("Show bot health status")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const status = await getStatus(interaction.client);
    const ok = status.status === "ok";
    const embed = new EmbedBuilder()
      .setTitle(`${ok ? "✅" : "⚠️"} Health: ${status.status.toUpperCase()}`)
      .setColor(ok ? OK_COLOUR : DEGRADED_COLOUR)
      .addFields(
        { name: "Uptime", value: `${status.uptime}s`, inline: true },
        { name: "WS Ping", value: `${status.ping}ms`, inline: true },
        { name: "Database", value: status.db, inline: true }
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
};
