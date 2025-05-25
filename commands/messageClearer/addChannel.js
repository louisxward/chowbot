const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { addServerClearChannel } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addchannel")
    .setDescription("addchannel - add channel to clear messages from at 00:00 UTC Daily")
    .addStringOption((option) => option.setName("channel_id").setDescription("id of the channel").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    logger.info("command - addchannel");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    const channelId = interaction.options.getString("channel_id");
    logger.info(`- channelId: ${channelId}`);
    if (await addServerClearChannel(serverId, channelId)) {
      await interaction.reply({ content: "channel_id has been added", ephemeral: true });
    } else {
      await interaction.reply({ content: "channel_id is already added", ephemeral: true });
    }
  }
};
