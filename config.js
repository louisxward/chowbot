const path = require("path");

const DATA_DIR = path.join(__dirname, "data");

module.exports = {
  DB_PATH: path.join(DATA_DIR, "chowbot.db"),
  SERVER_CONFIG_PATH: path.join(DATA_DIR, "serverConfig.json"),
  APPLICATION_CONFIG_PATH: path.join(DATA_DIR, "applicationConfig.json"),
  SESSION_STATE_PATH: path.join(DATA_DIR, "sessionState.json"),
PORT: process.env.PORT || 33002,
  INVENCHECKER_API_URL: process.env.INVENCHECKER_API_URL || "http://localhost:33001",
  TOKEN: process.env.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID,
  EMOJI_UPVOTE_ID: process.env.EMOJI_UPVOTE_ID || null,
  EMOJI_DOWNVOTE_ID: process.env.EMOJI_DOWNVOTE_ID || null
};
