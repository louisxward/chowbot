const { Events } = require("discord.js");
const logger = require("logger");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    logger.info("event - InteractionCreate");
    logger.info(`- serverId: ${interaction.guildId}`);
    logger.info(`- userId: ${interaction.user.id}`);
    logger.info(`- command: ${interaction.commandName}`);
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.error(`Command '${interaction.commandName}' not found`);
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
