const { readServerConfig, writeServerConfig } = require("services/serverConfigStorage");

async function getUid(guildId, userId) {
  const config = await readServerConfig();
  return config[guildId]?.invenchecker?.[userId] ?? null;
}

async function setUid(guildId, userId, uid) {
  const config = await readServerConfig();
  const server = config[guildId] ?? {};
  config[guildId] = { ...server, invenchecker: { ...server.invenchecker, [userId]: uid } };
  await writeServerConfig(config);
}

module.exports = { getUid, setUid };
