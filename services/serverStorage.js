const logger = require("logger");
const { createServer } = require("repositories/server");

async function botInvited(guild) {
  logger.info("function - botInvited");
  const serverId = guild.id;
  logger.info(`- serverId: ${serverId}`);
  const serverName = guild.name;
  logger.info(`- serverName: ${serverName}`);
  const ownerUserId = guild.commands.guild.ownerId;
  logger.info(`- ownerUserId: ${ownerUserId}`);
  createServer(serverId, serverName, ownerUserId);
}

module.exports = { botInvited };
