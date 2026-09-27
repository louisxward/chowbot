const config = require("config");
const logger = require("logger");
const { REST, Routes } = require("discord.js");
const { loadCommands } = require("utils/loadCommands");

// Registers slash commands globally, or for one server when serverId is given. Returns how many
// were registered and throws if Discord rejects them.
async function deployCommands(serverId) {
  logger.info("function - deployCommands");
  logger.info(`- serverId: ${serverId}`);
  const rest = new REST().setToken(config.TOKEN);
  const commands = readCommands();
  const route = serverId
    ? Routes.applicationGuildCommands(config.CLIENT_ID, serverId)
    : Routes.applicationCommands(config.CLIENT_ID);
  const data = await rest.put(route, { body: commands });
  logger.info(`- Successfully reloaded ${data.length} application (/) commands.`);
  return data.length;
}

async function deleteCommands(serverId) {
  logger.info("function - deleteCommands");
  logger.info(`- serverId: ${serverId}`);
  const rest = new REST().setToken(config.TOKEN);
  const route = serverId
    ? Routes.applicationGuildCommands(config.CLIENT_ID, serverId)
    : Routes.applicationCommands(config.CLIENT_ID);
  await rest.put(route, { body: [] });
  logger.info("- Successfully deleted commands.");
}

function readCommands() {
  logger.info("function - readCommands");
  return loadCommands().map((command) => command.data.toJSON());
}

module.exports = { readCommands, deployCommands, deleteCommands };
