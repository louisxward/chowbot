const { Events } = require("discord.js");
const { contentDetector } = require("../services/contentDetector.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../constants.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    console.log("[INFO] MessageCreate");
    if (await contentDetector(message)) {
      message
        .react(EMOJI_UPVOTE_ID)
        .then(() => message.react(EMOJI_DOWNVOTE_ID))
        .catch((error) => console.error(error));
    }
  },
};
