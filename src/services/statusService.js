const { ActivityType } = require("discord.js");
const { getAppConfig } = require("services/applicationConfigService");

let nextIndex = 0;

// Sets the bot's activity to the next status in applicationConfig.json's statuses
async function rotateStatus(client) {
  const { statuses = [] } = await getAppConfig();
  if (statuses.length === 0) return;
  const { name, type } = statuses[nextIndex % statuses.length];
  await client.user.setActivity(name, { type: ActivityType[type] });
  nextIndex = (nextIndex + 1) % statuses.length;
}

module.exports = { rotateStatus };
