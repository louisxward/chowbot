const { Events } = require("discord.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../constants.js");

module.exports = {
  name: Events.MessageCreate,
  execute(message) {
    console.log("[INFO] MessageCreate");
    if (message.attachments.size == 0) return;
    const contentType = message.attachments.first().contentType;
    if (null == contentType) return;
    if (contentType.includes("image") || contentType.includes("video")) {
      message
        .react(EMOJI_UPVOTE_ID)
        .then(() => message.react(EMOJI_DOWNVOTE_ID))
        .catch((error) => console.error(error));
    }
  },
};
