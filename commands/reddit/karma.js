const { SlashCommandBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("services/karmaStorage");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma leaderboard"),
  async execute(interaction) {
    const leaderboard = await getKarmaLeaderboard(interaction);
    if (!leaderboard || leaderboard.size == 0) {
      await interaction.reply({ content: "Leaderboard is empty", ephemeral: true });
      return;
    }
    let replyMessage = "";
    let pos = 0;
    let posMessage = "";
    for (const [key, value] of leaderboard.entries()) {
      pos += 1;
      if (pos === 1) {
        posMessage = `! ${pos.toString()}`;
      } else {
        posMessage = `${pos.toString()}`;
      }
      replyMessage += `${posMessage}. ${key}: ${value}\n`;
    }
    await interaction.reply({ content: replyMessage.trim(), ephemeral: true });
  }
};
