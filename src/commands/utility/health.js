const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getStatus } = require("services/healthService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("health")
    .setDescription("Show bot health status")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const status = await getStatus(interaction.client);

    const colour = status.status === "ok" ? 0x57f287 : 0xed4245;
    const icon = status.status === "ok" ? "✅" : "⚠️";

    const embed = new EmbedBuilder()
      .setTitle(`${icon} Health: ${status.status.toUpperCase()}`)
      .setColor(colour)
      .addFields(
        { name: "Uptime", value: `${status.uptime}s`, inline: true },
        { name: "WS Ping", value: `${status.ping}ms`, inline: true },
        { name: "Database", value: status.db, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
