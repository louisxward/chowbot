const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("touch").setDescription("touch me"),
  async execute(interaction) {
    await interaction.reply({ content: "uuuuuuuuhhhhm", ephemeral: true });
  }
};
