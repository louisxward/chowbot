const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });
    console.log(`[INFO] ${client.user.tag} INITIALISED`);
  },
};
