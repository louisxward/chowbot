const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();
require("app-module-path").addPath(__dirname);
const logger = require("./logger.js");

logger.info("deploy-commands - import local commands");
const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    logger.info(`- fileName: ${file}`);
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else {
      logger.warn(`- The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
  }
}
logger.info("deploy-commands - push local commands");
const rest = new REST().setToken(process.env.TOKEN);
(async () => {
  try {
    logger.info(`- Started refreshing ${commands.length} application (/) commands.`);

    //Specific Server
    const data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });

    //All Servers
    //const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });

    logger.info(`- Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(error);
  }
})();
