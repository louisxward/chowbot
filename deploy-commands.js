require("dotenv").config();
require("app-module-path").addPath(__dirname);

const { REST, Routes } = require("discord.js");
const logger = require("logger");
const fs = require("node:fs");
const path = require("node:path");

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
    //logger.info(`- Started refreshing ${commands.length} application (/) commands.`);
    // Push Commands
    // - Specific Server
    // const data = await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
    //   body: commands
    // });
    // - All Servers
    //const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    // Delete Commmands
    // - Specific Server
    // await rest
    //   .put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: [] })
    //   .then(() => console.log("Successfully deleted all guild commands."))
    //   .catch(console.error);
    // - All Servers
    // await rest
    //   .put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
    //   .then(() => console.log("Successfully deleted all application commands."))
    //   .catch(console.error);
    //logger.info(`- Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(error);
  }
})();
