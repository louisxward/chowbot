const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { contentDetector } = require("../../services/contentDetector.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../../constants.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("karma_manual")
    .setDescription("Manually React to message")
    .addStringOption((option) => option.setName("message_id").setDescription("id of the message"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    logger.info("command - karmaManual");
    logger.info(`- userId: ${interaction.user.id}`);
    const inputMessageId = interaction.options.getString("message_id") ?? "";
    if (null == inputMessageId || inputMessageId.length == 0) {
      await interaction.reply({ content: "message_id is empty", ephemeral: true });
      return;
    }
    logger.info(`- inputMessageId: ${inputMessageId}`);
    if (interaction.channel) {
      const channel = interaction.channel;
      let message;
      try {
        message = await channel.messages.fetch(inputMessageId);
      } catch (error) {
        logger.warn(error);
        await interaction.reply({ content: "message_id is invalid", ephemeral: true });
        return;
      }
      logger.info(`- foundMessageId: ${message.id}`);
      await message
        .react(EMOJI_UPVOTE_ID)
        .then(() => message.react(EMOJI_DOWNVOTE_ID))
        .catch((error) => logger.error(error));
      await interaction.reply({ content: "done", ephemeral: true });
    }
  },
};
