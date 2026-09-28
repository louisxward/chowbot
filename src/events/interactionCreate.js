const { Events, MessageFlags } = require("discord.js");
const logger = require("logger");

const ERROR_REPLY = { content: "There was an error while executing this command!", flags: MessageFlags.Ephemeral };

// Slash commands run the command's execute. Button custom ids are "<commandName>:<args...>" and
// run that command's handleButton(interaction, args).
module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      await runCommand(interaction);
    } else if (interaction.isButton()) {
      await runButton(interaction);
    }
  }
};

async function runCommand(interaction) {
  const { commandName, guildId, user } = interaction;
  logger.info({ command: commandName, serverId: guildId, userId: user.id }, "command - received");
  const command = interaction.client.commands.get(commandName);
  if (!command) {
    logger.warn({ command: commandName }, "command - not found");
    return;
  }
  await runSafely(interaction, commandName, () => command.execute(interaction));
}

async function runButton(interaction) {
  const [commandName, ...args] = interaction.customId.split(":");
  logger.info({ customId: interaction.customId, userId: interaction.user.id }, "command - button pressed");
  const command = interaction.client.commands.get(commandName);
  if (!command?.handleButton) {
    logger.warn({ customId: interaction.customId }, "command - no handler for button");
    return;
  }
  await runSafely(interaction, commandName, () => command.handleButton(interaction, args));
}

async function runSafely(interaction, commandName, run) {
  try {
    await run();
  } catch (err) {
    logger.error({ err, command: commandName }, "command - failed");
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(ERROR_REPLY);
    } else {
      await interaction.reply(ERROR_REPLY);
    }
  }
}
