const { SlashCommandBuilder, EmbedBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { getKarmaWeeklyLeaderboardFormatted } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Karma Leaderboard")
    .setContexts(InteractionContextType.Guild),
  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    let content = await getKarmaWeeklyLeaderboardFormatted(interaction.client.users);
    const embed = new EmbedBuilder().setTitle("Karma Leaderboard").setDescription(content);
    await interaction.editReply({
      embeds: [embed]
    });
  }
};
