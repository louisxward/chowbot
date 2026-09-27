const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { buildLeaderboardEmbed } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Karma Leaderboard")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const embed = await buildLeaderboardEmbed(interaction.client.users);
    await interaction.editReply({ embeds: [embed] });
  }
};
