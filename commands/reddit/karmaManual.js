const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { contentDetector } = require("../../services/contentDetector.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../../constants.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("karmaManual")
    .setDescription("Manually React to message")
    .addStringOption((option) => option.setName("messageId").setDescription("id of the message"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    logger.info("command - karmaManual");
    logger.info(`- userId: ${interaction.user.id}`);
    const messageId = interaction.options.getString("messageId") ?? "";
    if (null == messageId || messageId.length == 0) {
      await interaction.reply({ content: "messageId is empty", ephemeral: true });
      return;
    }
    logger.info(`- messageId: ${messageId}`);
    // if (interaction.channel) {
    //   const channel = interaction.channel;
    //   let message;
    //   try {
    //     message = await channel.messages.fetch(messageId);
    //     if (!message) {
    //       await interaction.reply({ content: "messageId is invalid", ephemeral: true });
    //       return;
    //     }
    //   } catch (error) {
    //     await interaction.reply({ content: "messageId is invalid", ephemeral: true });
    //     return;
    //   }
    //   if (await contentDetector(message)) {
    //     await message
    //       .react(EMOJI_UPVOTE_ID)
    //       .then(() => message.react(EMOJI_DOWNVOTE_ID))
    //       .catch((error) => logger.error(error));
    //   }
    // }
  },
};
