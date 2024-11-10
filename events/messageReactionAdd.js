const { Events } = require("discord.js");
const { karmaCounter } = require("../services/karmaCounter.js");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    console.log("[INFO] MessageReactionAdd");
    await karmaCounter(reaction, user, true);
  },
};
