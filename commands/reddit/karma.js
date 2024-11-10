const { SlashCommandBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("../../services/karmaStorage.js");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma Leaderboard"),
  async execute(interaction) {
    console.log("[INFO] Command - karma");
    const leaderboard = await getKarmaLeaderboard(interaction);
    if (null == leaderboard || leaderboard.size == 0) {
      await interaction.reply({ content: "leaderboard is empty", ephemeral: true });
      return;
    }
    let leaderboardString = "";
    for (const [key, value] of leaderboard.entries()) {
      leaderboardString += `${key}: ${value}\n`;
    }
    await interaction.reply({ content: leaderboardString.trim(), ephemeral: true });
  },
};
