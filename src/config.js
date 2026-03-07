const path = require("path");

console.log(__dirname);
const DATA_DIR = path.join(__dirname, "../data");
module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json"),
  SESSION_STATE_PATH: path.join(DATA_DIR, "sessionState.json"),
  USER_CONFIG_PATH: path.join(DATA_DIR, "userConfig.json"),
  PORT: process.env.PORT || 33002,
  INVENCHECKER_API_URL: process.env.INVENCHECKER_API_URL || "http://localhost:33001",
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  BURST_THRESHOLD: parseInt(process.env.BURST_THRESHOLD) || 5,
  BURST_WINDOW_MS: parseInt(process.env.BURST_WINDOW_MS) || 3000,
  RECONCILE_DELAY_MS: parseInt(process.env.RECONCILE_DELAY_MS) || 15000
};
