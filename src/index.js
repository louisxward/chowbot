// Load .env if present; variables already set in the environment take precedence
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}
require("app-module-path").addPath(__dirname);

const { Client, Collection, Events, GatewayIntentBits, Partials } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const config = require("config");
const logger = require("logger");
const { init, close: closeDatabase } = require("services/databaseService");
const { getAppConfig } = require("services/applicationConfigService");
const { deployCommands } = require("services/commandDeployer");
const { stopSchedules } = require("services/readyService");
const { loadCommands } = require("utils/loadCommands");
const { createApp } = require("./app");

// Anything that slips past a handler is logged rather than taking the bot down
process.on("unhandledRejection", (err) => {
  logger.error({ err }, "process - unhandled rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "process - uncaught exception");
  process.exit(1);
});

// Application config validation
getAppConfig()
  .then((appConfig) => {
    if (!appConfig.domainList?.length) logger.warn("startup - domainList is empty or missing");
  })
  .catch((err) => logger.error({ err }, "startup - failed to read applicationConfig.json"));

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
if (!config.ADMIN_TOKEN) logger.warn("startup - ADMIN_TOKEN is not set, admin API is disabled");

// Data directory
fs.mkdirSync(path.join(__dirname, "../data"), { recursive: true });

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
client.on(Events.Error, (err) => logger.error({ err }, "client - error"));

// Commands
logger.info("startup - import commands");
client.commands = new Collection();
for (const command of loadCommands()) {
  client.commands.set(command.data.name, command);
}

// Events. A failing handler is logged and doesn't affect other events.
logger.info("startup - import events");
for (const file of fs.readdirSync(path.join(__dirname, "events")).filter((f) => f.endsWith(".js"))) {
  const event = require(path.join(__dirname, "events", file));
  client[event.once ? "once" : "on"](event.name, async (...args) => {
    try {
      await event.execute(...args);
    } catch (err) {
      logger.error({ err, event: event.name }, "event - handler failed");
    }
  });
}

const app = createApp(client);
let server;

// Database migrations must finish before the API or Discord events can touch the db
async function start() {
  logger.info("startup - database");
  init();

  server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "startup - api");
  });

  // Login
  logger.info("startup - login");
  await client.login(config.TOKEN);

  // Deploy commands if flag is set
  if (process.argv.includes("--deploy-commands")) {
    logger.info("startup - deploying commands (--deploy-commands flag)");
    deployCommands().catch((err) => logger.error({ err }, "startup - deployCommands failed"));
  }
}

// Stop scheduled jobs, the API, the Discord connection and the database, then exit. Forces an
// exit if that takes longer than Docker's 10 second stop timeout allows.
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutdown - start");
  setTimeout(() => {
    logger.error("shutdown - timed out, forcing exit");
    process.exit(1);
  }, 8000).unref();
  try {
    stopSchedules();
    server?.close();
    await client.destroy();
    closeDatabase();
    logger.info("shutdown - done");
    process.exit(0);
  } catch (err) {
    logger.error({ err }, "shutdown - failed");
    process.exit(1);
  }
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

start().catch((err) => {
  logger.fatal({ err }, "startup - failed");
  process.exit(1);
});
