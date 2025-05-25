const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { manualServerClear } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("runclear")
    .setDescription("runClear - !!!DANGEROUS!!! runs clear channel function")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("command - runClear");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    await manualServerClear(interaction.client, serverId);
    await interaction.reply({ content: "channels clearing", ephemeral: true });
  }
};
