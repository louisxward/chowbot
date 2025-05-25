const { SlashCommandBuilder } = require("discord.js");
const logger = require("logger");
const { getUserKarma } = require("services/karmaStorage");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("checkkarma")
    .setDescription("Check karma - leave blank for yours")
    .addUserOption((option) => option.setName("whos").setDescription("whos karma to check")),
  async execute(interaction) {
    logger.info("command - checkKarma");
    const userId = interaction.user.id;
    logger.info(`- userId: ${interaction.user.id}`);
    let checkUserId;
    let checkUserName;
    try {
      const whos = interaction.options.getUser("whos");
      checkUserId = whos.id;
      checkUserName = whos.displayName;
      logger.info(`- whosId: ${checkUserId}`);
    } catch (error) {
      checkUserId = userId;
      checkUserName = interaction.user.displayName;
    }
    try {
      const karma = await getUserKarma(checkUserId);
      let replyMessage = "";
      if (null == karma) {
        replyMessage = `${checkUserName} is a pagan`;
      } else {
        replyMessage = `${checkUserName}: ${karma.toString()}`;
      }
      await interaction.reply({ content: replyMessage, ephemeral: true });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "im dying help me... pls", ephemeral: true });
    }
  }
};
