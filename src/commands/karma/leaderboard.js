const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { buildLeaderboardMessage } = require("services/leaderboardService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Karma Leaderboard")
    .setContexts(InteractionContextType.Guild),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply(await buildLeaderboardMessage(interaction.client.users));
  },

  // Page buttons ("leaderboard:<page>"). On the user's own ephemeral leaderboard they turn the
  // page in place. On the weekly post in a channel they open a private copy instead, so one
  // person paging doesn't change the post for everyone.
  async handleButton(interaction, [page]) {
    if (interaction.message.flags.has(MessageFlags.Ephemeral)) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply(await buildLeaderboardMessage(interaction.client.users, Number(page)));
  }
};
