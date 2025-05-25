const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { addServerClearChannel } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addchannel")
    .setDescription("addchannel - !!!DANGEROUS!!! add channel to clear messages from at 05:00 UTC Daily")
    .addStringOption((option) => option.setName("channel_id").setDescription("id of the channel").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("command - addchannel");
    logger.info(`- userId: ${interaction.user.id}`);
    const serverId = interaction.guildId;
    logger.info(`- serverId: ${serverId}`);
    const channelId = interaction.options.getString("channel_id");
    logger.info(`- channelId: ${channelId}`);
    // if (await addServerClearChannel(interaction.client, serverId, channelId)) {
    //   await interaction.reply({ content: "channel_id has been added", ephemeral: true });
    // } else {
    //   await interaction.reply({ content: "channel_id is already added", ephemeral: true });
    // }

    try {
      await addServerClearChannel(interaction.client, serverId, channelId);
      await interaction.reply({ content: "channel_id has been added", ephemeral: true });
    } catch (error) {
      await interaction.reply({ content: error, ephemeral: true });
    }
  }
};
