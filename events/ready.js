const { Events, ActivityType } = require("discord.js");
const logger = require("logger");

const { clearSetChannels, addServerClearChannel, removeServerClearChannel } = require("services/messageClearer");

//const CLEAR_INTERVAL = 24 * 60 * 60 * 1000;
const CLEAR_INTERVAL = 5000;

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`${client.user.tag} INITIALISED`);
    await client.user.setActivity("DrankDrankDrank By Nettspend", { type: ActivityType.Listening });

    //ToDo - change to utc time
    // Message Clearer Job
    // setInterval(async () => {
    //   await clearSetChannels(client);
    // }, CLEAR_INTERVAL);
    //await clearSetChannels(client);
  }
};
