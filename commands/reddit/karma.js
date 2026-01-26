const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getKarmaLeaderboard, leaderboardFormatter } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma leaderboard"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const leaderboard = await getKarmaLeaderboard(interaction);
    let content = await leaderboardFormatter(leaderboard);
    const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(content);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
