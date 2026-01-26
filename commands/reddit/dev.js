const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("logger");

const { getKarmaWeeklyLeaderboardTest, logWeekly } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
    logger.info("LOG WEEKLY");
    //await logWeekly();
    logger.info("LEADERBOARD");
    await interaction.deferReply({ ephemeral: true });
    const leaderboard = await getKarmaWeeklyLeaderboardTest(interaction);
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
    const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(replyMessage);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
