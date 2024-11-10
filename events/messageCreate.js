const { Events } = require("discord.js");
const { EMOJI_UPVOTE, EMOJI_DOWNVOTE } = require("../constants.js");

module.exports = {
  name: Events.MessageCreate,
  execute(message) {
    if (message.attachments.size == 0) return;
    const contentType = message.attachments.first().contentType;
    if (null == contentType) return;
    if (contentType.includes("image") || contentType.includes("video")) {
      console.log("[INFO] MessageCreate - redditReact - content detected must react");
      message
        .react(EMOJI_UPVOTE)
        .then(() => message.react(EMOJI_DOWNVOTE))
        .catch((error) => console.error("[ERROR] MessageCreate - redditReact - failed to react :(", error));
    }
  },
};
