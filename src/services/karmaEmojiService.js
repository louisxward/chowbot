const logger = require("logger");
const { getAppConfig } = require("services/applicationConfigService");

// Custom (application) emojis are referenced by their numeric id; anything else is a unicode emoji
const CUSTOM_EMOJI_ID = /^\d+$/;

// The karma emojis that passed validation, sorted by sort. Karma reactions are off while empty.
let activeEmojis = [];

// Reads karmaEmojis from applicationConfig.json and keeps the valid entries: an id (a custom
// emoji id that exists on the application, or a unicode emoji), an integer value, and an
// optional sort. Invalid entries are logged and skipped.
async function validateKarmaEmojis(client) {
  const entries = await getConfiguredEmojis();
  const appEmojis = entries.some((entry) => CUSTOM_EMOJI_ID.test(String(entry?.id)))
    ? await client.application.emojis.fetch()
    : new Map();
  const valid = [];
  for (const [index, entry] of entries.entries()) {
    const problem = findProblem(entry, appEmojis, valid);
    if (problem) {
      logger.warn({ index, entry, problem }, "karma - skipping invalid karma emoji");
      continue;
    }
    valid.push({ id: String(entry.id), value: entry.value, sort: entry.sort ?? index });
  }
  activeEmojis = valid.sort((a, b) => a.sort - b.sort);
  if (activeEmojis.length === 0) {
    logger.warn("karma - no valid karma emojis, karma reactions disabled");
  } else {
    logger.info({ emojis: activeEmojis }, "karma - karma emojis loaded");
  }
}

async function getConfiguredEmojis() {
  const config = await getAppConfig();
  if (Array.isArray(config.karmaEmojis)) return config.karmaEmojis;
  // Before karmaEmojis there was one fixed upvote (+1) and downvote (-1) emoji
  if (config.emojiUpvoteId || config.emojiDownvoteId) {
    logger.warn("karma - emojiUpvoteId/emojiDownvoteId are deprecated, move them to karmaEmojis");
    return [
      { id: config.emojiUpvoteId, sort: 1, value: 1 },
      { id: config.emojiDownvoteId, sort: 2, value: -1 }
    ];
  }
  return [];
}

function findProblem(entry, appEmojis, valid) {
  // Discord ids are too big for JSON numbers, which would silently change them
  if (typeof entry?.id === "number") return "id must be a string, in quotes";
  const id = entry?.id == null ? "" : String(entry.id);
  if (!id) return "missing id";
  if (!Number.isInteger(entry.value)) return "value must be a whole number";
  if (entry.sort != null && !Number.isFinite(entry.sort)) return "sort must be a number";
  if (CUSTOM_EMOJI_ID.test(id) && !appEmojis.has(id)) return "not an emoji on this application";
  if (valid.some((emoji) => emoji.id === id)) return "duplicate id";
  return null;
}

function getKarmaEmojis() {
  return activeEmojis;
}

// The karma emoji config for a reaction's emoji, or undefined if it isn't a karma emoji
function findKarmaEmoji(emoji) {
  const key = emoji.id ?? emoji.name;
  return activeEmojis.find((karmaEmoji) => karmaEmoji.id === key);
}

function hasKarmaEmojis() {
  return activeEmojis.length > 0;
}

function clearKarmaEmojis() {
  activeEmojis = [];
}

module.exports = { validateKarmaEmojis, getKarmaEmojis, findKarmaEmoji, hasKarmaEmojis, clearKarmaEmojis };
