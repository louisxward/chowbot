const { Events } = require("discord.js");

module.exports = {
  name: Events.MessageReactionAdd,
  execute(message) {
    console.log("[INFO] MessageReactionAdd");
    console.log(message);
    if (message.me) return;
  },
};
