const logger = require("logger");
const { createServer } = require("repositories/server");

async function botInvited(guild) {
  try {
    const owner = await guild.fetchOwner();
    console.log(`Joined new guild: ${guild.name} (ID: ${guild.id})`);
    console.log(`Guild owner: ${owner.user.tag} (ID: ${owner.id})`);
  } catch (err) {
    console.error(`Failed to fetch guild owner for ${guild.name}:`, err);
  }
}

module.exports = { botInvited };
