const { readFile, invalidateCache } = require("services/storageHelper");
const { APPLICATION_CONFIG_PATH } = require("config");
const logger = require("logger");

let cache = null;
let emojisValid = false;

async function getAppConfig() {
  if (!cache) cache = await readFile(APPLICATION_CONFIG_PATH);
  return cache;
}

async function reloadAppConfig() {
  logger.info("map - reload app config");
  invalidateCache(APPLICATION_CONFIG_PATH);
  cache = await readFile(APPLICATION_CONFIG_PATH);
  return cache;
}

function setEmojisValid(val) {
  emojisValid = val;
}

function areEmojisValid() {
  return emojisValid;
}

module.exports = { getAppConfig, reloadAppConfig, setEmojisValid, areEmojisValid };
