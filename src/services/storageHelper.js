const fs = require("fs/promises");
const logger = require("logger");

const encoding = "utf8";
const cache = new Map();

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

async function readFile(filePath) {
  logger.debug("function - readFile ");
  logger.debug(`- filePath: ${filePath}`);
  if (cache.has(filePath)) return clone(cache.get(filePath));
  let data = {};
  try {
    const fileContent = await fs.readFile(filePath, encoding);
    if (fileContent.trim()) data = JSON.parse(fileContent);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  cache.set(filePath, data);
  return clone(data);
}

function invalidateCache(filePath) {
  cache.delete(filePath);
}

module.exports = { readFile, invalidateCache };
