const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");
const { addKarmaReactions } = require("services/contentDetector");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("react")
    .setDescription("Manually react to a message in this channel")
    .addStringOption((option) => option.setName("message_id").setDescription("id of the message").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction) {
    const inputMessageId = interaction.options.getString("message_id");
    logger.info(`- inputMessageId: ${inputMessageId}`);
    let message = null;
    try {
      message = await interaction.channel.messages.fetch(inputMessageId);
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "message_id is invalid", ephemeral: true });
      return;
    }
    await addKarmaReactions(message);
    await interaction.reply({ content: "reacted :P", ephemeral: true });
  }
};
