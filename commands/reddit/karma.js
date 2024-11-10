const { SlashCommandBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("../../services/karmaStorage.js");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma Leaderboard"),
  async execute(interaction) {
    console.log("[INFO] Command - karma");
    const leaderboard = await getKarmaLeaderboard(interaction);
    let replyMessage = "";
    if (null == leaderboard || leaderboard.size == 0) {
      replyMessage = "leaderboard is empty";
    } else {
      for (const [key, value] of leaderboard.entries()) {
        replyMessage += `${key}: ${value}\n`;
      }
      replyMessage = replyMessage.trim();
    }
    await interaction.reply({ content: replyMessage, ephemeral: true });
  },
};
