const logger = require("logger");
const { upsertMessage } = require("repositories/message");
const { getAppConfig, areEmojisValid } = require("services/applicationConfigService");

const MEDIA_TYPES = ["image", "video"];
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Posts get karma reactions if they embed a link from domainList or attach an image or video
async function contentDetector(message) {
  const { domainList = [] } = await getAppConfig();
  const hasValidEmbed = message.embeds.some(
    (embed) => embed.url && domainList.some((domain) => embed.url.includes(domain))
  );
  if (hasValidEmbed) return true;
  return message.attachments.some(
    (attachment) => attachment.contentType && MEDIA_TYPES.some((type) => attachment.contentType.includes(type))
  );
}

// Edits only count for messages less than 24 hours old
function checkMessageAge(message) {
  return Date.now() - message.createdTimestamp <= EDIT_WINDOW_MS;
}

async function addKarmaReactions(message) {
  if (!areEmojisValid()) return;
  const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
  await message.react(emojiUpvoteId);
  await message.react(emojiDownvoteId);
}

async function storeMessage(message) {
  if (!message.guildId) return;
  await upsertMessage(message.id, message.guildId, message.author.id, message.createdAt.toISOString());
}

// Handles a new or edited message: adds karma reactions to qualifying posts and records them
async function handleMessage(message, isUpdate) {
  if (!areEmojisValid()) return;
  if (message.author?.bot) return;
  if (message.partial) {
    try {
      await message.fetch();
    } catch (err) {
      logger.error({ err, messageId: message.id }, "message - failed to fetch partial message");
      return;
    }
  }
  if (isUpdate && !checkMessageAge(message)) return;
  if (!(await contentDetector(message))) return;

  logger.info(
    { serverId: message.guildId, messageId: message.id, authorId: message.author.id },
    "message - content detected"
  );
  try {
    await addKarmaReactions(message);
  } catch (err) {
    logger.error({ err, messageId: message.id }, "message - failed to add karma reactions");
  }
  await storeMessage(message);
}

module.exports = { handleMessage, addKarmaReactions, contentDetector, checkMessageAge };
