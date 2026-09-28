// Load .env if present; variables already set in the environment take precedence
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}
// Must run before any bare require("services/...") style import below
require("app-module-path").addPath(__dirname);

const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits, Partials } = require("discord.js");
const config = require("config");
const logger = require("logger");
const { init: initDatabase, close: closeDatabase } = require("database");
const { getAppConfig } = require("services/applicationConfigService");
const { loadCommands, deployCommands } = require("services/commandService");
const { stopSchedules } = require("services/schedulerService");
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
  logger.fatal({ missing }, "startup - missing required environment variables");
  process.exit(1);
}
if (!config.ADMIN_TOKEN) logger.warn("startup - ADMIN_TOKEN is not set, admin API is disabled");

// Data directory
fs.mkdirSync(path.join(__dirname, "../data"), { recursive: true });

// Client
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
client.commands = new Collection(loadCommands().map((command) => [command.data.name, command]));
logger.info({ count: client.commands.size }, "startup - commands loaded");

// Events. A failing handler is logged and doesn't affect other events.
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
  initDatabase();
  logger.info("startup - database ready");

  server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "startup - api listening");
  });

  await client.login(config.TOKEN);

  if (process.argv.includes("--deploy-commands")) {
    deployCommands().catch((err) => logger.error({ err }, "startup - deploy commands failed"));
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
