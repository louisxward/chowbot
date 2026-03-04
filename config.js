const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  LEADERBOARD_CONFIG_PATH: path.join(DATA_DIR, "leaderboardWeeklyChannelConfig.json"),
  MESSAGE_CLEARER_CONFIG_PATH: path.join(DATA_DIR, "messageClearerConfig.json")
};
