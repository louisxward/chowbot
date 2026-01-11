const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getKarmaLeaderboard } = require("services/karmaStorage");

module.exports = {
  data: new SlashCommandBuilder().setName("karma").setDescription("Karma leaderboard"),
  async execute(interaction) {
    const leaderboard = await getKarmaLeaderboard(interaction);
    if (!leaderboard || leaderboard.size == 0) {
      await interaction.reply({ content: "Leaderboard is empty", ephemeral: true });
      return;
    }
    let replyMessage = "**Karma Leaderboard**\n";
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
    await interaction.reply({ content: replyMessage.trim(), ephemeral: true });
  }
};
