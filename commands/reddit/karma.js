const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma leaderboard"),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const leaderboard = await getKarmaLeaderboard(interaction);
    let replyMessage = "";
    if (!leaderboard || leaderboard.size == 0) {
      replyMessage = "Empty";
    } else {
      let medal = null;
      for (const [key, e] of leaderboard.entries()) {
        medal = null;
        if (e.index === 1) {
          medal = `🥇`;
        } else if (e.index === 2) {
          medal = `🥈`;
        } else if (e.index === 3) {
          medal = `🥉`;
        }
        replyMessage += `${medal ? medal : e.index.toString() + ". "} ${e.index < 4 ? "**" + key + "**" : key}: ${e.value}\n`;
      }
    }
    const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(replyMessage);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
