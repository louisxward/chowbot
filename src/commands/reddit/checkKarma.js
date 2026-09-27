const { SlashCommandBuilder, MessageFlags, InteractionContextType } = require("discord.js");
const logger = require("logger");
const { getUserKarma } = require("services/karmaService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkkarma")
    .setDescription("Check karma - leave blank for yours")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) => option.setName("whos").setDescription("whos karma to check")),
  async execute(interaction) {
    const target = interaction.options.getUser("whos") ?? interaction.user;
    const checkUserId = target.id;
    const checkUserName = target.displayName;
    logger.info(`- whosId: ${checkUserId}`);
    try {
      const karma = await getUserKarma(checkUserId);
      let replyMessage = "";
      if (null == karma) {
        replyMessage = `${checkUserName} is a pagan`;
      } else {
        replyMessage = `${checkUserName}: ${karma.toString()}`;
      }
      await interaction.reply({ content: replyMessage, flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "im dying help me... pls", flags: MessageFlags.Ephemeral });
    }
  }
};
