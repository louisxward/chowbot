const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { clearSetChannels } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearchannels")
    .setDescription("clearchannels - !!!DANGEROUS!!! runs clear channel function")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("command - clearchannels");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    // ToDo - should only clear channels for this server
    await clearSetChannels(interaction.client);
    await interaction.reply({ content: "channels clearing", ephemeral: true });
  }
};
