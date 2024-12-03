const { SlashCommandBuilder } = require("discord.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder().setName("touch").setDescription("touch me"),
  async execute(interaction) {
    logger.info("command - touch");
    logger.info(`- userId: ${interaction.user.id}`);
    await interaction.reply({ content: "uuuuuuuuhhhhm", ephemeral: true });
  }
};
