const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("logger");

const { getKarmaLeaderboard, logWeekly } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
    await interaction.deferReply({ ephemeral: true });
    const embed = new EmbedBuilder().setTitle("Karma Weekly Leaderboard").setDescription("replyMessage");

    await logWeekly();

    await interaction.editReply({
      embeds: [embed]
    });
  }
};
