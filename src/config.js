const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json"),
  // Legacy JSON files, only read once by database migrations v4 and v5 to import into SQLite
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  USER_CONFIG_PATH: path.join(DATA_DIR, "userConfig.json"),
  SESSION_STATE_PATH: path.join(DATA_DIR, "sessionState.json"),
  PORT: process.env.PORT || 33002,
  INVENCHECKER_API_URL: process.env.INVENCHECKER_API_URL || "http://localhost:33001",
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  ADMIN_TOKEN: process.env.ADMIN_TOKEN,
  LOG_LEVEL: process.env.LOG_LEVEL || "info"
};
