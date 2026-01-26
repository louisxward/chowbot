const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { persistKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("persistweeklyleaderboard")
    .setDescription("Persist Weekly Leaderboard to DB")
    .addStringOption((option) => option.setName("confirm").setDescription("type RUN to confirm").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const confirm = interaction.options.getString("confirm");
    if (confirm !== "RUN") {
      await interaction.reply({ content: "oops", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    await persistKarmaWeeklyLeaderboard();
    await interaction.editReply({ content: "Weekly Leaderboard saved!", ephemeral: true });
  }
};
