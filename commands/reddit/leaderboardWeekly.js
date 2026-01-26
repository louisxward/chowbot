const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getKarmaWeeklyLeaderboardFormatted } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder().setName("leaderboardweekly").setDescription("Karma Weekly Leaderboard"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    let content = await getKarmaWeeklyLeaderboardFormatted(interaction.client.users);
    const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(content);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
