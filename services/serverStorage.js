const logger = require("logger");
const { createServer } = require("repositories/server");

async function botInvited(guild) {
  logger.info("function - botInvited");
  const serverId = guild.id;
  const serverName = guild.name;
  logger.info(`- serverId: ${serverId}`);
  logger.info(`- serverName: ${serverName}`);
  const ownerId = await guild.fetchOwner().id;
  logger.info(`- ownerUserId: ${ownerId}`);
}

module.exports = { botInvited };
