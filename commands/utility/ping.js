const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!"),
  async execute(interaction) {
    console.log("[INFO] Command - ping");
    await interaction.reply({ content: "Pong!", ephemeral: true });
  },
};
