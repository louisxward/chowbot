const { SlashCommandBuilder } = require("discord.js");
const logger = require("logger");
const { getKarmaLeaderboard } = require("services/karmaStorage");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma leaderboard"),
  async execute(interaction) {
    logger.info("command - karma");
    const leaderboard = await getKarmaLeaderboard(interaction);
    if (!leaderboard || leaderboard.size == 0) {
      await interaction.reply({ content: "Leaderboard is empty", ephemeral: true });
      return;
    }
    let replyMessage = "";
    for (const [key, value] of leaderboard.entries()) {
      replyMessage += `${key}: ${value}\n`;
    }
    await interaction.reply({ content: replyMessage.trim(), ephemeral: true });
  }
};
