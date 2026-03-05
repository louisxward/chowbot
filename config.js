const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json")
};
