const { Events } = require("discord.js");
const { serverLeft } = require("services/serverService");

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    await serverLeft(guild);
  }
};
