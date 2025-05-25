const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { addServerClearChannel } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addClearChannel")
    .setDescription("addClearChannel - !!!DANGEROUS!!! add channel to clear messages from at 05:00 UTC Daily")
    .addStringOption((option) => option.setName("channel_id").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("command - addClearChannel");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    const channelId = interaction.options.getString("channel_id");
    logger.info(`- channelId: ${channelId}`);
    try {
      await addServerClearChannel(interaction.client, serverId, channelId);
      await interaction.reply({ content: "channel_id has been added", ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: error, ephemeral: true });
    }
  }
};
