const { Events } = require("discord.js");
const { updateUserKarma, getUserKarma } = require("../services/karma.js");
const { EMOJI_UPVOTE, EMOJI_DOWNVOTE } = require("../constants.js");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    console.log("[INFO] MessageReactionAdd - karma");
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error(error);
        return;
      }
    }
    if (user.bot) return;
    const authorId = reaction.message.author.id;
    if (user.id == authorId) return;
    const emojiId = reaction._emoji.id;
    if (emojiId == EMOJI_UPVOTE) {
      await updateUserKarma(authorId, 1);
    } else if (emojiId == EMOJI_DOWNVOTE) {
      await updateUserKarma(authorId, -1);
    }
    console.log("authorId: ", authorId);
    console.log("authorKarma: ", await getUserKarma(authorId));
  },
};
