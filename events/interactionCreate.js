const { Events } = require("discord.js");
const logger = require("logger");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    logger.info("event - InteractionCreate");
    logger.info(`- serverId: ${interaction.guildId}`);
    logger.info(`- userId: ${interaction.user.id}`);
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.error(`- No command matching ${interaction.commandName} was found.`);
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
      } else {
        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
      }
    }
  }
};
