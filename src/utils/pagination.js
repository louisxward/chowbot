const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Discord embed limits
const EMBED_DESCRIPTION_LIMIT = 4096;
const EMBED_FIELD_LIMIT = 1024;
const EMBED_TOTAL_LIMIT = 6000;
const EMBED_MAX_FIELDS = 25;

function pageCount(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize));
}

// Clamps a requested page (possibly out of range or NaN from a button id) to 0..count-1
function clampPage(page, count) {
  if (!Number.isInteger(page) || page < 0) return 0;
  return Math.min(page, count - 1);
}

// Splits lines into chunks of whole lines, each at most maxLength characters once joined.
// A single line longer than maxLength is cut short with an ellipsis.
function chunkLines(lines, maxLength, separator = "\n") {
  const chunks = [];
  let current = "";
  for (const rawLine of lines) {
    const line = rawLine.length > maxLength ? `${rawLine.slice(0, maxLength - 1)}…` : rawLine;
    const next = current ? current + separator + line : line;
    if (next.length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

// Turns { name, lines } sections into embed fields, splitting a section across several fields
// ("name (cont.)") when it's over the field limit
function sectionsToFields(sections) {
  return sections.flatMap(({ name, lines }) =>
    chunkLines(lines, EMBED_FIELD_LIMIT).map((value, i) => ({ name: i === 0 ? name : `${name} (cont.)`, value }))
  );
}

// Groups fields into pages that each fit in one embed, leaving headroom for the title
function paginateFields(fields, { maxFields = 10, maxChars = EMBED_TOTAL_LIMIT - 1000 } = {}) {
  const limit = Math.min(maxFields, EMBED_MAX_FIELDS);
  const pages = [];
  let page = [];
  let chars = 0;
  for (const field of fields) {
    const size = field.name.length + field.value.length;
    if (page.length && (page.length >= limit || chars + size > maxChars)) {
      pages.push(page);
      page = [];
      chars = 0;
    }
    page.push(field);
    chars += size;
  }
  if (page.length) pages.push(page);
  return pages;
}

// ◀ / "page x/y" / ▶ buttons. idForPage(page) builds the custom id for a button that opens
// that page. Returns no rows when there's only one page.
function buildPageButtons(idForPage, page, count) {
  if (count <= 1) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(idForPage(page - 1))
        .setLabel("◀")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId(`${idForPage(page)}:current`)
        .setLabel(`${page + 1}/${count}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(idForPage(page + 1))
        .setLabel("▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= count - 1)
    )
  ];
}

module.exports = {
  EMBED_DESCRIPTION_LIMIT,
  EMBED_FIELD_LIMIT,
  pageCount,
  clampPage,
  chunkLines,
  sectionsToFields,
  paginateFields,
  buildPageButtons
};
