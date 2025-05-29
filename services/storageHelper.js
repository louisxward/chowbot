const fs = require("fs/promises");
const logger = require("logger");

const encoding = "utf8";

async function readFile(filePath) {
  logger.info("function - readFile ");
  logger.info(`- filePath: ${filePath}`);
  let data = {};
  try {
    const fileContent = await fs.readFile(filePath, encoding);
    data = JSON.parse(fileContent);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return data;
}
async function writeFile(filePath, data) {
  logger.info("function - writeFile");
  logger.info(`- filePath: ${filePath}`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = { readFile, writeFile };
