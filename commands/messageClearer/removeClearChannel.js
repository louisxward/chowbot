const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { removeServerClearChannel } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removeclearchannel")
    .setDescription("removeClearChannel - remove channel from having messages cleared")
    .addStringOption((option) => option.setName("channel_id").setDescription("id of the channel").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("command - removeclearchannel");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    const channelId = interaction.options.getString("channel_id");
    logger.info(`- channelId: ${channelId}`);
    try {
      await removeServerClearChannel(serverId, channelId);
      await interaction.reply({ content: "channel_id has been removed", ephemeral: true });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: error, ephemeral: true });
    }
  }
};
