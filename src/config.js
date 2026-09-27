const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json"),
  // Legacy JSON files, only read once by database migration v4 to import into SQLite
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  USER_CONFIG_PATH: path.join(DATA_DIR, "userConfig.json"),
  PORT: process.env.PORT || 33002,
  INVENCHECKER_API_URL: process.env.INVENCHECKER_API_URL || "http://localhost:33001",
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID
};
