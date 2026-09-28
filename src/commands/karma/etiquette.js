const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { reportEtiquette } = require("services/karmaService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("etiquette")
    .setDescription("Report User for Good/Bad Etiquette")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) => option.setName("who").setDescription("the person who").setRequired(true))
    .addBooleanOption((option) =>
      option.setName("good").setDescription("'true' for good or 'false' for bad etiquette").setRequired(true)
    )
    .addStringOption((option) => option.setName("reason").setDescription("please explain...").setRequired(true)),

  async execute(interaction) {
    const who = interaction.options.getUser("who");
    if (who.id === interaction.user.id) {
      await interaction.reply({ content: "Sorry but you cannot report yourself", flags: MessageFlags.Ephemeral });
      return;
    }
    const good = interaction.options.getBoolean("good");
    const reason = interaction.options.getString("reason");
    const accepted = await reportEtiquette(interaction.guildId, who.id, interaction.user.id, good, reason);
    const content = accepted
      ? "Thank you for your input, please leave this with us as we investigate further"
      : `You've already reported ${who.displayName} in the last 24 hours`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
};
