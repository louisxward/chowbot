const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("react")
    .setDescription("React to a message in this channel")
    .addStringOption((option) => option.setName("message_id").setDescription("id of the message").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const inputMessageId = interaction.options.getString("message_id");
    logger.info(`- inputMessageId: ${inputMessageId}`);
    try {
      const message = await interaction.channel.messages.fetch(inputMessageId);
      await message.react(EMOJI_UPVOTE_ID).then(() => message.react(EMOJI_DOWNVOTE_ID));
      await interaction.reply({ content: "reacted :P", ephemeral: true });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "message_id is invalid", ephemeral: true });
    }
  }
};
