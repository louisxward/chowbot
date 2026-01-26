const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("logger");

const { persistKarmaWeeklyLeaderboard, getKarmaWeeklyLeaderboardFormatted } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
    // logger.info("LOG WEEKLY");
    // await persistKarmaWeeklyLeaderboard();
    logger.info("LEADERBOARD");
    await interaction.deferReply({ ephemeral: true });
    const content = await getKarmaWeeklyLeaderboardFormatted(interaction.client.users);
    const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(content);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
