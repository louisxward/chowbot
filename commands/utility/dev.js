const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");

const { sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub.setName("sendleaderboard").setDescription("Send karma weekly leaderboard"))
    .addSubcommand((sub) => sub.setName("clearstate").setDescription("Clear session state (username cache)"))
    .addSubcommand((sub) => sub.setName("reloadconfig").setDescription("Reload application config from disk")),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    logger.info(`DEV COMMAND - ${sub}`);
    if (sub === "sendleaderboard") {
      await interaction.reply({ ephemeral: true, content: "Sending leaderboard..." });
      await sendKarmaWeeklyLeaderboard(interaction.client);
    } else if (sub === "clearstate") {
      await clearSessionState();
      await interaction.reply({ ephemeral: true, content: "Session state cleared." });
    } else if (sub === "reloadconfig") {
      await reloadAppConfig();
      await interaction.reply({ ephemeral: true, content: "Application config reloaded." });
    }
  }
};
