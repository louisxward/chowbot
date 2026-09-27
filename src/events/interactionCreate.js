const { Events, MessageFlags } = require("discord.js");
const logger = require("logger");

const ERROR_REPLY = { content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral };

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, guildId, user } = interaction;
    logger.info({ command: commandName, serverId: guildId, userId: user.id }, "command - received");
    const command = interaction.client.commands.get(commandName);
    if (!command) {
      logger.warn({ command: commandName }, "command - not found");
      return;
    }
    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, command: commandName }, "command - failed");
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(ERROR_REPLY);
      } else {
        await interaction.reply(ERROR_REPLY);
      }
    }
  }
};
