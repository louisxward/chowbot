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
      let pos = 0;
      let medal = null;
      for (const [key, value] of leaderboard.entries()) {
        pos += 1;
        medal = null;
        if (pos === 1) {
          medal = `🥇`;
        } else if (pos === 2) {
          medal = `🥈`;
        } else if (pos === 3) {
          medal = `🥉`;
        }
        replyMessage += `${medal ? medal : pos.toString() + ". "} ${pos < 4 ? "**" + key + "**" : key}: ${value}\n`;
      }
    }
    const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(replyMessage);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
