const { Events } = require("discord.js");
const logger = require("logger");
const contentDetector = require("services/contentDetector");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    //todo oldMessage - check if not existing
    if (await contentDetector(newMessage)) {
      await newMessage
        .react(EMOJI_UPVOTE_ID)
        .then(() => newMessage.react(EMOJI_DOWNVOTE_ID))
        .catch((error) => logger.error(error));
    }
  }
};
