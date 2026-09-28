const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const { getUserKarma } = require("services/karmaService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkkarma")
    .setDescription("Check karma - leave blank for yours")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) => option.setName("whos").setDescription("whos karma to check")),

  async execute(interaction) {
    const target = interaction.options.getUser("whos") ?? interaction.user;
    const karma = await getUserKarma(target.id);
    const content = karma === null ? `${target.displayName} is a pagan` : `${target.displayName}: ${karma}`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral });
  }
};
