const { Events } = require("discord.js");
const { serverJoined } = require("services/serverService");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    await serverJoined(guild);
  }
};
