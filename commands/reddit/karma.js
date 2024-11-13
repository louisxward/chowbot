const { SlashCommandBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("../../services/karmaStorage.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma Leaderboard"),
  async execute(interaction) {
    logger.info("command - karma");
    logger.info(`- userId: ${interaction.user.id}`);
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
