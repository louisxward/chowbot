const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { manualServerClear } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("runclear")
    .setDescription("runClear - !!!DANGEROUS!!! runs clear channel function")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await manualServerClear(interaction.client, interaction.guildId);
    await interaction.reply({ content: "channels clearing", ephemeral: true });
  }
};
