const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Development Use Only")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    logger.info("DEV COMMAND");
  }
};
