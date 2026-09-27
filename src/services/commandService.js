const fs = require("node:fs");
const path = require("node:path");
const { REST, Routes } = require("discord.js");
const config = require("config");
const logger = require("logger");

const COMMANDS_DIR = path.join(__dirname, "../commands");

// Loads every commands/<folder>/*.js that exports { data, execute }
function loadCommands() {
  const commands = [];
  for (const folder of fs.readdirSync(COMMANDS_DIR)) {
    const folderPath = path.join(COMMANDS_DIR, folder);
    for (const file of fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"))) {
      const command = require(path.join(folderPath, file));
      if ("data" in command && "execute" in command) {
        commands.push(command);
      } else {
        logger.warn({ file }, "command - skipping file, missing data or execute");
      }
    }
  }
  return commands;
}

// Registers slash commands globally, or for one server when serverId is given. Returns how many
// were registered and throws if Discord rejects them.
async function deployCommands(serverId) {
  const body = loadCommands().map((command) => command.data.toJSON());
  const route = serverId
    ? Routes.applicationGuildCommands(config.CLIENT_ID, serverId)
    : Routes.applicationCommands(config.CLIENT_ID);
  const data = await new REST().setToken(config.TOKEN).put(route, { body });
  logger.info({ serverId: serverId ?? "global", count: data.length }, "command - deployed");
  return data.length;
}

module.exports = { loadCommands, deployCommands };
