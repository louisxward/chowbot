const logger = require("logger");
const { createServer, deleteServer } = require("repositories/server");

async function botInvited(serverId, serverName, ownerUserId) {
  logger.info("function - botInvited");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- serverName: ${serverName}`);
  logger.info(`- ownerUserId: ${ownerUserId}`);
  createServer(serverId, serverName, ownerUserId);
}

async function botUnInvited(serverId) {
  logger.info("function - botUnInvited");
  logger.info(`- serverId: ${serverId}`);
  deleteServer(serverId);
}

module.exports = { botInvited, botUnInvited };
