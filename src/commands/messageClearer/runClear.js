const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { manualServerClear } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("runclear")
    .setDescription("runClear - !!!DANGEROUS!!! runs clear channel function")
    .addStringOption((option) => option.setName("confirm").setDescription("type run to confirm").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const confirm = interaction.options.getString("confirm");
    if (confirm !== "RUN") {
      await interaction.reply({ content: "oops", ephemeral: true });
      return;
    }
    await manualServerClear(interaction.client, interaction.guildId);
    await interaction.reply({ content: "channels clearing", ephemeral: true });
  }
};
