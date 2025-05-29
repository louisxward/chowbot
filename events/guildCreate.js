const { Events } = require("discord.js");
const { karmaCalculator } = require("services/karmaStorage");

module.exports = {
  name: Events.GuildCreate,
  async execute(reaction, user) {
    await karmaCalculator(reaction, user, true);
  }
};
