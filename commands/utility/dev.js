const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const logger = require("logger");

const { sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
    await interaction.reply({ ephemeral: true, content: "SENT" });
    await sendKarmaWeeklyLeaderboard(interaction.client);
  }
};
