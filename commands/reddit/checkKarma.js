const { SlashCommandBuilder } = require("discord.js");
const { getUserKarma } = require("../../services/karmaStorage.js");
const logger = require("logger");

module.exports = {
  data: new SlashCommandBuilder().setName("check_karma").setDescription("Check yours/someones karma"),
  async execute(interaction) {
    logger.info("command - checkKarma");
    const userId = interaction.user.id;
    logger.info(`- userId: ${interaction.user.id}`);
    try {
      const karma = await getUserKarma(userId);
      let replyMessage = "";
      if (null == karma) {
        replyMessage = "You dont have any karma... bih boi";
      } else {
        replyMessage = karma.toString();
      }
      await interaction.reply({ content: replyMessage, ephemeral: true });
    } catch (error) {
      logger.error(error);
      await interaction.reply({ content: "im dying help me... pls", ephemeral: true });
    }
  },
};
