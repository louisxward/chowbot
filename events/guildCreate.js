const { Events } = require("discord.js");
const { botInvited } = require("services/serverStorage");

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    await botInvited(guild.id, guild.name, guild.commands.guild.ownerId);
    //todo -  add commands
  }
};
