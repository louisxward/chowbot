const { SlashCommandBuilder } = require("discord.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  async execute(interaction) {
    logger.info("command - ping");
    await interaction.reply({ content: "rogeroger", ephemeral: true });
  },
};
