const logger = require("logger");
const { getDb } = require("database");

// type is the channel list, e.g. "clearChannels" or "leaderboardChannels"

async function getChannels(serverId, type) {
  logger.debug("repository - getChannels");
  return getDb()
    .prepare("SELECT channelId FROM ServerChannel WHERE serverId = ? AND type = ? ORDER BY rowid")
    .all(serverId, type)
    .map((row) => row.channelId);
}

async function getAllChannels(type) {
  logger.debug("repository - getAllChannels");
  return getDb().prepare("SELECT serverId, channelId FROM ServerChannel WHERE type = ? ORDER BY rowid").all(type);
}

async function addChannel(serverId, type, channelId) {
  logger.debug("repository - addChannel");
  const result = getDb()
    .prepare("INSERT OR IGNORE INTO ServerChannel (serverId, type, channelId) VALUES (?, ?, ?)")
    .run(serverId, type, channelId);
  if (result.changes === 0) throw new Error("Channel is already in the list");
}

async function removeChannel(serverId, type, channelId) {
  logger.debug("repository - removeChannel");
  const result = getDb()
    .prepare("DELETE FROM ServerChannel WHERE serverId = ? AND type = ? AND channelId = ?")
    .run(serverId, type, channelId);
  if (result.changes === 0) throw new Error("Channel isn't in the list");
}

module.exports = { getChannels, getAllChannels, addChannel, removeChannel };
