const logger = require("logger");
const { handleMessageEvent: storeMessage } = require("services/messageService");
const { getAppConfig, areEmojisValid } = require("services/applicationConfigService");

async function contentDetector(message) {
  const { domainList = [] } = await getAppConfig();
  const videoImageTypes = ["image", "video"];
  const hasValidEmbed = message.embeds.some(
    (embed) => embed.url && domainList.some((domain) => embed.url.includes(domain))
  );
  if (hasValidEmbed) {
    return true;
  }
  const hasValidAttachment = message.attachments.some(
    (attachment) => attachment.contentType && videoImageTypes.some((type) => attachment.contentType.includes(type))
  );
  return hasValidAttachment;
}

async function addKarmaReactions(message) {
  if (!areEmojisValid()) return;
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  await message.react(emojiUpvoteId);
  await message.react(emojiDownvoteId);
}

// returns true if valid age less than 24h
function checkMessageAge(message) {
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const isTooOld = Date.now() - message.createdTimestamp > oneDayInMs;
  return !isTooOld;
}

async function handleMessageEvent(message, isUpdate) {
  if (!areEmojisValid()) return;
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
  if (await contentDetector(message)) {
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
