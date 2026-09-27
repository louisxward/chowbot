const fs = require("node:fs");
const path = require("node:path");
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
        logger.warn(`commands - skipping ${file}, missing data or execute`);
      }
    }
  }
  return commands;
}

module.exports = { loadCommands };
