const logger = require("logger");
const { createServer } = require("repositories/server");

async function botInvited(serverId, serverName, ownerUserId) {
  logger.info("function - botInvited");
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- serverName: ${serverName}`);
  logger.info(`- ownerUserId: ${ownerUserId}`);
  createServer(serverId, serverName, ownerUserId);
}

module.exports = { botInvited };
