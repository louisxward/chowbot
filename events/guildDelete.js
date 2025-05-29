const { Events } = require("discord.js");
const { botUnInvited } = require("services/serverStorage");

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    await botUnInvited(guild.id);
  }
};
