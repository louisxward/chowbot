const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, InteractionContextType } = require("discord.js");
const { hasKarmaEmojis } = require("services/karmaEmojiService");
const { addKarmaReactions } = require("services/messageService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("react")
    .setDescription("Manually react to a message in this channel")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption((option) => option.setName("message_id").setDescription("id of the message").setRequired(true)),

  async execute(interaction) {
    if (!hasKarmaEmojis()) {
      await interaction.reply({ content: "emoji are ids not valid", flags: MessageFlags.Ephemeral });
      return;
    }
    const messageId = interaction.options.getString("message_id");
    const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: "message_id is invalid", flags: MessageFlags.Ephemeral });
      return;
    }
    await addKarmaReactions(message);
    await interaction.reply({ content: "reacted :P", flags: MessageFlags.Ephemeral });
  }
};
