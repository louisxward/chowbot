const logger = require("logger");
const { createServer, deleteServer } = require("repositories/server");

async function serverJoined(guild) {
  logger.info({ serverId: guild.id, serverName: guild.name, ownerUserId: guild.ownerId }, "server - joined");
  await createServer(guild.id, guild.name, guild.ownerId);
}

async function serverLeft(guild) {
  logger.info({ serverId: guild.id }, "server - left");
  await deleteServer(guild.id);
}

module.exports = { serverJoined, serverLeft };
