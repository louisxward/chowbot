const fs = require("node:fs/promises");
const { APPLICATION_CONFIG_PATH } = require("config");
const logger = require("logger");

// data/applicationConfig.json is edited by hand. It's read once and cached until reloaded.
let cache = null;
let emojisValid = false;

async function readConfigFile() {
  try {
    const content = await fs.readFile(APPLICATION_CONFIG_PATH, "utf8");
    return content.trim() ? JSON.parse(content) : {};
  } catch (err) {
    if (err.code === "ENOENT") return {};
    throw err;
  }
}

async function getAppConfig() {
  if (!cache) cache = await readConfigFile();
  return cache;
}

async function reloadAppConfig() {
  logger.info("config - reloading applicationConfig.json");
  cache = await readConfigFile();
  return cache;
}

// Checks the up/down vote emoji ids exist as application emojis. Karma reactions stay disabled
// until they do.
async function validateEmojis(client) {
  const appEmojis = await client.application.emojis.fetch();
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  let allValid = true;
  for (const [key, emojiId] of Object.entries({ emojiUpvoteId, emojiDownvoteId })) {
    const emoji = emojiId && appEmojis.get(emojiId);
    if (emoji) {
      logger.info({ key, emojiId, name: emoji.name }, "config - emoji ok");
    } else {
      logger.warn({ key, emojiId }, "config - emoji missing or not found, karma reactions disabled");
      allValid = false;
    }
  }
  emojisValid = allValid;
}

function setEmojisValid(value) {
  emojisValid = value;
}

function areEmojisValid() {
  return emojisValid;
}

module.exports = { getAppConfig, reloadAppConfig, validateEmojis, setEmojisValid, areEmojisValid };
