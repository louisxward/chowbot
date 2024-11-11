const { Events } = require("discord.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../constants.js");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    console.log("[INFO] MessageCreate");
    if (message.partial) {
      try {
        await message.fetch();
      } catch (error) {
        console.error(error);
        return;
      }
    }
    if (message.embeds.length == 0) {
      if (message.attachments.size == 0) return;
      const contentType = message.attachments.first().contentType;
      if (null == contentType) return;
      if (!contentType.includes("image") && !contentType.includes("video")) return;
    }
    message
      .react(EMOJI_UPVOTE_ID)
      .then(() => message.react(EMOJI_DOWNVOTE_ID))
      .catch((error) => console.error(error));
  },
};
