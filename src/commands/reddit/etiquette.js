const { SlashCommandBuilder } = require("discord.js");
const { reportEtiquette } = require("services/karmaService");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("etiquette")
    .setDescription("Report User for Good/Bad Etiquette")
    .addUserOption((option) => option.setName("who").setDescription("the person who").setRequired(true))
    .addBooleanOption((option) =>
      option.setName("good").setDescription("'true' for good or 'false' for bad etiquette").setRequired(true)
    )
    .addStringOption((option) => option.setName("reason").setDescription("please explain...").setRequired(true)),

  async execute(interaction) {
    const userId = interaction.user.id;
    const who = interaction.options.getUser("who");
    if (userId === who.id) {
      await interaction.reply({
        content: "Sorry but you cannot report yourself",
        ephemeral: true
      });
      return;
    }
    const good = interaction.options.getBoolean("good");
    const reason = interaction.options.getString("reason");
    logger.info(`- whoId: ${who.id}`);
    logger.info(`- good: ${good}`);
    logger.info(`- reason: ${reason}`);
    const accepted = await reportEtiquette(interaction.guildId, who.id, userId, good, reason);
    if (!accepted) {
      await interaction.reply({
        content: `You've already reported ${who.displayName} in the last 24 hours`,
        ephemeral: true
      });
      return;
    }
    await interaction.reply({
      content: "Thank you for your input, please leave this with us as we investigate further",
      ephemeral: true
    });
  }
};
