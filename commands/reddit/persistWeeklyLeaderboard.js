const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { persistKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("persistweeklyleaderboard")
    .setDescription("Persist Weekly Leaderboard to DB"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    await persistKarmaWeeklyLeaderboard();
    await interaction.editReply({ content: "Weekly Leaderboard saved!", ephemeral: true });
  }
};
