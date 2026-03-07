const { readFile, writeFile } = require("services/storageHelper");
const { SERVER_CONFIG_PATH } = require("config");

async function readServerConfig() {
  return readFile(SERVER_CONFIG_PATH);
}

async function writeServerConfig(config) {
  return writeFile(SERVER_CONFIG_PATH, config);
}

async function getChannels(serverId, key) {
  const config = await readServerConfig();
  return config[serverId]?.[key] ?? [];
}

async function addChannel(serverId, key, channelId) {
  const config = await readServerConfig();
  const server = config[serverId] ?? {};
  const channels = server[key] ?? [];
  if (channels.includes(channelId)) throw "already exists";
  config[serverId] = { ...server, [key]: [...channels, channelId] };
  await writeServerConfig(config);
}

async function removeChannel(serverId, key, channelId) {
  const config = await readServerConfig();
  const server = config[serverId] ?? {};
  const channels = server[key] ?? [];
  if (!channels.includes(channelId)) throw "doesnt exist";
  config[serverId] = { ...server, [key]: channels.filter((id) => id !== channelId) };
  await writeServerConfig(config);
}

async function getPendingReconcile(serverId) {
  const config = await readServerConfig();
  return config[serverId]?.pendingReconcile ?? [];
}

async function addPendingReconcile(serverId, messageId, channelId) {
  const config = await readServerConfig();
  const server = config[serverId] ?? {};
  const pending = server.pendingReconcile ?? [];
  if (pending.some((e) => e.messageId === messageId)) return;
  config[serverId] = { ...server, pendingReconcile: [...pending, { messageId, channelId }] };
  await writeServerConfig(config);
}

async function removePendingReconcile(serverId, messageId) {
  const config = await readServerConfig();
  const server = config[serverId] ?? {};
  const pending = server.pendingReconcile ?? [];
  config[serverId] = { ...server, pendingReconcile: pending.filter((e) => e.messageId !== messageId) };
  await writeServerConfig(config);
}

module.exports = {
  readServerConfig,
  getClearChannels: (serverId) => getChannels(serverId, "clearChannels"),
  addClearChannel: (serverId, channelId) => addChannel(serverId, "clearChannels", channelId),
  removeClearChannel: (serverId, channelId) => removeChannel(serverId, "clearChannels", channelId),
  getLeaderboardChannels: (serverId) => getChannels(serverId, "leaderboardChannels"),
  addLeaderboardChannel: (serverId, channelId) => addChannel(serverId, "leaderboardChannels", channelId),
  removeLeaderboardChannel: (serverId, channelId) => removeChannel(serverId, "leaderboardChannels", channelId),
  getPendingReconcile,
  addPendingReconcile,
  removePendingReconcile
};
