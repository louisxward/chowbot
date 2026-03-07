const logger = require("logger");
const { BURST_THRESHOLD, BURST_WINDOW_MS, RECONCILE_DELAY_MS } = require("config");
const { getAppConfig } = require("services/applicationConfigService");
const { createKarma, deleteKarma, updateKarma, getKarmaByMessageAndEmoji } = require("repositories/karma");
const { addPendingReconcile, removePendingReconcile, getAllPendingReconcile } = require("services/sessionStateStorage");

const KARMA_TYPE_MESSAGE = 0;

// Map<messageId, { count, windowStart, debounceTimer, serverId, channelId }>
const burstMap = new Map();

async function recordEvent(reaction) {
  const messageId = reaction.message.id;
  const serverId = reaction.message.guildId;
  const channelId = reaction.message.channelId;
  const client = reaction.client;
  const now = Date.now();

  let entry = burstMap.get(messageId);

  // Already in burst mode — keep debouncing regardless of window age
  if (entry && entry.bursting) {
    clearTimeout(entry.debounceTimer);
    entry.debounceTimer = setTimeout(async () => {
      logger.info(`burst - debounce fired for message ${messageId}`);
      burstMap.delete(messageId);
      await reconcileMessage(serverId, messageId, channelId, client);
    }, RECONCILE_DELAY_MS);
    return true;
  }

  if (!entry || now - entry.windowStart > BURST_WINDOW_MS) {
    if (entry) clearTimeout(entry.debounceTimer);
    burstMap.set(messageId, { count: 1, windowStart: now, debounceTimer: null, bursting: false, serverId, channelId });
    return false;
  }

  entry.count++;

  if (entry.count >= BURST_THRESHOLD) {
    logger.info(`burst - threshold hit for message ${messageId}, queuing reconcile`);
    entry.bursting = true;
    await addPendingReconcile(serverId, messageId, channelId);

    clearTimeout(entry.debounceTimer);
    entry.debounceTimer = setTimeout(async () => {
      logger.info(`burst - debounce fired for message ${messageId}`);
      burstMap.delete(messageId);
      await reconcileMessage(serverId, messageId, channelId, client);
    }, RECONCILE_DELAY_MS);

    return true;
  }

  return false;
}

async function reconcileMessage(serverId, messageId, channelId, client) {
  logger.info(`burst - reconciling message ${messageId}`);
  try {
    const { emojiUpvoteId, emojiDownvoteId } = await getAppConfig();
    const channel = await client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    const authorId = message.author.id;

    for (const [emojiId, value] of [
      [emojiUpvoteId, 1],
      [emojiDownvoteId, -1]
    ]) {
      if (!emojiId) continue;
      const discordReaction = message.reactions.resolve(emojiId);
      logger.info(discordReaction);
      const discordUserIds = new Set();
      if (discordReaction) {
        const users = await discordReaction.users.fetch();
        for (const [userId, user] of users) {
          //if (!user.bot && userId !== authorId) discordUserIds.add(userId);
          if (!user.bot) discordUserIds.add(userId);
        }
      }

      const dbRecords = await getKarmaByMessageAndEmoji(serverId, messageId, emojiId);
      const dbUserIds = new Set(dbRecords.map((r) => r.fromUserId));

      for (const userId of discordUserIds) {
        if (!dbUserIds.has(userId)) {
          logger.info(`burst - reconcile add userId=${userId} messageId=${messageId}`);
          if ((await updateKarma(serverId, messageId, userId, emojiId, value)) == 0) {
            await createKarma(serverId, messageId, authorId, userId, emojiId, value, null, KARMA_TYPE_MESSAGE);
          }
        }
      }

      for (const userId of dbUserIds) {
        if (!discordUserIds.has(userId)) {
          logger.info(`burst - reconcile remove userId=${userId} messageId=${messageId}`);
          await deleteKarma(serverId, messageId, userId, emojiId);
        }
      }
    }

    await removePendingReconcile(serverId, messageId);
    logger.info(`burst - reconciliation complete for message ${messageId}`);
  } catch (error) {
    logger.error({ err: error }, `burst - reconciliation failed for message ${messageId}`);
  }
}

async function processPendingReconcile(client) {
  logger.info("burst - processing pending reconcile on startup");
  const pending = await getAllPendingReconcile();
  for (const [serverId, entries] of Object.entries(pending)) {
    for (const { messageId, channelId } of entries) {
      await reconcileMessage(serverId, messageId, channelId, client);
    }
  }
}

module.exports = { recordEvent, processPendingReconcile };
