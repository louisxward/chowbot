const { Events } = require("discord.js");
const logger = require("logger");
const { contentDetector } = require("services/contentDetector");

const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("appConstants");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    logger.info("!!message create");
    if (await contentDetector(message)) {
      await message
        .react(EMOJI_UPVOTE_ID)
        .then(() => message.react(EMOJI_DOWNVOTE_ID))
        .catch((error) => logger.error(error));
    }
  }
};
