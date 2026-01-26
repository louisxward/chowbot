const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("logger");

const {
  getKarmaWeeklyLeaderboardTest,
  logWeekly,
  leaderboardFormatter,
  getKarmaWeeklyLeaderboard
} = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
    // logger.info("LOG WEEKLY");
    // await logWeekly();
    // logger.info("LEADERBOARD TEST");
    // await interaction.deferReply({ ephemeral: true });
    // const leaderboard = await getKarmaWeeklyLeaderboardTest(interaction);
    // let content = await leaderboardFormatter(leaderboard);
    // const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(content);
    // await interaction.editReply({
    //   embeds: [embed]
    // });
    logger.info("LEADERBOARD");
    await interaction.deferReply({ ephemeral: true });
    const content = await getKarmaWeeklyLeaderboard(interaction.client.users);
    const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription(content);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
