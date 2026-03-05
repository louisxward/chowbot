const logger = require("logger");
const { handleMessageEvent: storeMessage } = require("services/messageService");

require("dotenv").config();

function contentDetector(message) {
  const videoImageTypes = ["image", "video"];
  const domainList = [
    "youtube.com/",
    "twitter.com/",
    "x.com/",
    "streamable.com/",
    "youtu.be/",
    "tiktok.com/",
    "gyazo.com/",
    "twitch.com/"
  ];
  const hasValidEmbed = message.embeds.some(
    (embed) => embed.url && domainList.some((domain) => embed.url.includes(domain))
  );
  const hasValidAttachment = message.attachments.some(
    (attachment) => attachment.contentType && videoImageTypes.some((type) => attachment.contentType.includes(type))
  );
  return hasValidEmbed || hasValidAttachment;
}

async function addKarmaReactions(message) {
  await message.react(process.env.EMOJI_UPVOTE_ID);
  await message.react(process.env.EMOJI_DOWNVOTE_ID);
}

// returns true if valid age less than 24h
function checkMessageAge(message) {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const isTooOld = Date.now() - message.createdTimestamp > oneDayInMs;
  return !isTooOld;
}

async function handleMessageEvent(message, isUpdate) {
  if (message.author.bot) return;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (error) {
      logger.error(error);
      return;
    }
  }
  if (isUpdate && !checkMessageAge(message)) {
    return;
  }
  if (contentDetector(message)) {
    logger.info("event - content detected");
    logger.info(`- authorId: ${message.author.id}`);
    logger.info(`- messageId: ${message.id}`);
    try {
      await addKarmaReactions(message);
    } catch (error) {
      logger.error({ err: error }, "event - failed to add karma reactions");
    }
    await storeMessage(message);
  }
}

module.exports = { handleMessageEvent, addKarmaReactions, contentDetector, checkMessageAge };
