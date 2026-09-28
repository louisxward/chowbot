const fs = require("node:fs/promises");
const { APPLICATION_CONFIG_PATH } = require("config");
const logger = require("logger");

// data/applicationConfig.json is edited by hand. It's read once and cached until reloaded.
let cache = null;

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

module.exports = { getAppConfig, reloadAppConfig };
