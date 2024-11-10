const { Events } = require("discord.js");
const { karmaCounter } = require("../services/karmaCounter.js");

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    console.log("[INFO] MessageReactionRemove");
    await karmaCounter(reaction, user, false);
  },
};
