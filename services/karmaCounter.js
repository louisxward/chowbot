const { updateUserKarma, getUserKarma } = require("./karmaStorage.js");
const { EMOJI_UPVOTE_ID, EMOJI_DOWNVOTE_ID } = require("../constants.js");

async function karmaCounter(reaction, user, addReaction) {
  console.log("[INFO] karmaCounter");
  if (user.bot) return;
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (error) {
      console.error(error);
      return;
    }
  }
  const authorId = reaction.message.author.id;
  if (user.id == authorId) return;
  const emojiId = reaction._emoji.id;
  if (emojiId == EMOJI_UPVOTE_ID) {
    await updateUserKarma(authorId, addReaction ? 1 : -1);
  } else if (emojiId == EMOJI_DOWNVOTE_ID) {
    await updateUserKarma(authorId, addReaction ? -1 : 1);
  }
}

module.exports = { karmaCounter };
