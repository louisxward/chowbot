const { SlashCommandBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("../../services/karmaStorage.js");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma Leaderboard"),
  async execute(interaction) {
    console.log("[INFO] Command - karma");
    await getKarmaLeaderboard(interaction);
    await interaction.reply("karma");
  },
};
