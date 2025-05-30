require("dotenv").config();

const logger = require("logger");
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

//MODULE NOT IN USE

async function deployCommands(serverId) {
  logger.info("function - deployCommands");
  logger.info(`- serverId: ${serverId}`);
  const rest = new REST().setToken(process.env.TOKEN);
  try {
    const commands = readCommands();
    let data;
    if (serverId) {
      data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, serverId), {
        body: commands
      });
    } else {
      data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    }
    logger.info(`- Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(error);
  }
}

async function deleteCommands(serverId) {
  logger.info("function - deleteCommands");
  logger.info(`- serverId: ${serverId}`);
  const rest = new REST().setToken(process.env.TOKEN);
  try {
    if (serverId) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, serverId), { body: [] });
      logger.info("Successfully deleted all guild commands.");
    } else {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
      logger.info("Successfully deleted all application commands.");
    }
  } catch (error) {
    logger.error(error);
  }
}

function readCommands() {
  logger.info("function - readCommands");
  const commands = [];
  const foldersPath = path.join("commands");
  const commandFolders = fs.readdirSync(foldersPath);
  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
      } else {
        logger.warn(`- The command at ${filePath} is missing a required "data" or "execute" property.`);
      }
    }
  }
  return commands;
}

module.exports = { readCommands, deployCommands, deleteCommands };
