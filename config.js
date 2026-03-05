const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json"),
  SESSION_STATE_PATH: path.join(DATA_DIR, "sessionState.json"),
  INVENCHECKER_STATE_PATH: path.join(DATA_DIR, "invencheckerState.json"),
  INVENCHECKER_API_URL: process.env.INVENCHECKER_API_URL || "http://localhost:3000"
};
