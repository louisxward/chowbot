require("dotenv").config();
require("app-module-path").addPath(__dirname);

const { Client, Collection, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");

const config = require("config");
const logger = require("logger");
const { init } = require("services/databaseService");
const { getAppConfig } = require("services/applicationConfigService");

// Application config validation
getAppConfig().then((appConfig) => {
  if (!appConfig.domainList?.length) logger.warn("startup - domainList is empty or missing");
});

// Env validation
const REQUIRED_VARS = ["TOKEN", "CLIENT_ID"];
const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  logger.fatal(
    { missingVariables: missing },
    `startup - missing required environment variables: ${missing.join(", ")}`
  );
  process.exit(1);
}

// Data directory
fs.mkdirSync(path.join(__dirname, "data"), { recursive: true });

// Client
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

// Commands
logger.info("startup - import commands");
client.commands = new Collection();
for (const folder of fs.readdirSync(path.join(__dirname, "commands"))) {
  const commandsPath = path.join(__dirname, "commands", folder);
  for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"))) {
    const command = require(path.join(commandsPath, file));
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      logger.warn(`startup - skipping ${file}, missing data or execute`);
    }
  }
}

// Events
logger.info("startup - import events");
for (const file of fs.readdirSync(path.join(__dirname, "events")).filter((f) => f.endsWith(".js"))) {
  const event = require(path.join(__dirname, "events", file));
  client[event.once ? "once" : "on"](event.name, (...args) => event.execute(...args));
}

// Database
logger.info("startup - database");
init();

// Express app
const app = express();
app.use(express.json());
app.use(require("./routes"));

// Global error handler
app.use((err, req, res, _next) => {
  logger.error({ err, path: req.path }, "Unhandled request error");
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, "startup - api");
});

// Login
logger.info("startup - login");
client.login(config.TOKEN);
