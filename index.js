require("dotenv").config();
require("app-module-path").addPath(__dirname);

const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const logger = require("logger");
const fs = require("node:fs");
const path = require("node:path");

// Client Init
// ToDo - Needs looking at
logger.info("startup - client init");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

// Import Commands
logger.info("startup - import commands");
client.commands = new Collection();
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
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`- missing data command`);
    }
  }
}

// Import Events
logger.info("startup - import events");
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  logger.info(`- fileName: ${file}`);
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Client Login
logger.info("startup - login");
client.login(process.env.TOKEN);
