const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("react")
    .setDescription("React to a message in this channel")
    .addStringOption((option) => option.setName("message_id").setDescription("id of the message"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    logger.info("command - react");
    logger.info(`- userId: ${interaction.user.id}`);
    const inputMessageId = interaction.options.getString("message_id");
    if (!inputMessageId) {
      await interaction.reply({ content: "message_id is empty", ephemeral: true });
      return;
    }
    logger.info(`- inputMessageId: ${inputMessageId}`);
    try {
      const message = await channel.messages.fetch(inputMessageId);
      logger.info("- found: true");
      await message.react(EMOJI_UPVOTE_ID).then(() => message.react(EMOJI_DOWNVOTE_ID));
      await interaction.reply({ content: "reacted :P", ephemeral: true });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "message_id is invalid", ephemeral: true });
    }
  }
};
