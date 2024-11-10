const { Events } = require("discord.js");
const { updateUserKarma, getUserKarma } = require("../services/karma.js");

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction) {
    console.log("[INFO] MessageReactionAdd - karmaCounter");
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        return;
      }
    }
    //if (!reaction.me) return;
    // console.log("- - - - - -");
    // console.log(reaction);
    // console.log("- - - - - -");
    const authorId = reaction.message.author.id;
    const count = reaction.count;
    console.log("authorId: ", authorId);
    console.log("responseCount: ", count);
    console.log("emojiId: ", reaction._emoji.id);
    console.log("me: ", reaction.me);
    await updateUserKarma(authorId, count);
    console.log("storeCount: ", await getUserKarma(authorId));
  },
};
