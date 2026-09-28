const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const logger = require("logger");
const { getUid, setUid } = require("repositories/invencheckerUser");
const { ALERT_COLOUR, formatAlert } = require("services/invencheckerAlertService");
const {
  createAccountByDiscord,
  addSteam64Id,
  removeSteam64Id,
  addCustomItem,
  removeCustomItem,
  resolveAllAlerts,
  getUserAlerts,
  getAccountSummary,
  getAccountProgress,
  getAccountPrices
} = require("services/invencheckerService");
const { formatPrice } = require("utils/format");
const {
  EMBED_DESCRIPTION_LIMIT,
  buildPageButtons,
  chunkLines,
  clampPage,
  paginateFields,
  sectionsToFields
} = require("utils/pagination");

const STEAM64_ID = /^\d{17}$/;
const SUMMARY_COLOUR = 0x00aaff;
const PROGRESS_COLOUR = 0x00cc66;
const PRICES_COLOUR = 0xffcc00;
const DEFAULT_PRICE_DAYS = 7;
const NO_ACCOUNT_REPLY = {
  content: "No invenchecker account linked. Use `/invenchecker account register` first.",
  flags: MessageFlags.Ephemeral
};

// Subcommands that need a linked account. Each gets (interaction, uid) after the reply is
// deferred, and returns what to edit the reply to.
const ACCOUNT_HANDLERS = {
  "steam add": steamAdd,
  "steam remove": steamRemove,
  "item add": itemAdd,
  "item remove": itemRemove,
  "alerts list": (_interaction, uid) => renderView("alerts", uid),
  "alerts resolve": alertsResolve,
  "view summary": (_interaction, uid) => renderView("summary", uid),
  "view progress": (_interaction, uid) => renderView("progress", uid),
  "view prices": (interaction, uid) =>
    renderView("prices", uid, 0, {
      days: interaction.options.getInteger("days") ?? DEFAULT_PRICE_DAYS,
      item: interaction.options.getString("item")
    })
};

// Views that can run over one embed. Each loads its data and returns the embed's title and
// colour plus either lines (shown in the description) or sections ({ name, lines } fields).
const VIEWS = {
  alerts: loadAlertsView,
  summary: loadSummaryView,
  progress: loadProgressView,
  prices: loadPricesView
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("invenchecker")
    .setDescription("Manage your invenchecker account and alerts")

    // /invenchecker account register
    .addSubcommandGroup((group) =>
      group
        .setName("account")
        .setDescription("Account management")
        .addSubcommand((sub) =>
          sub.setName("register").setDescription("Register your Discord account with invenchecker")
        )
    )

    // /invenchecker steam add <id>
    // /invenchecker steam remove <id>
    .addSubcommandGroup((group) =>
      group
        .setName("steam")
        .setDescription("Manage linked Steam64 IDs")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add a Steam64 ID to your account")
            .addStringOption((option) =>
              option
                .setName("id")
                .setDescription("Steam64 ID (17 digits)")
                .setMinLength(17)
                .setMaxLength(17)
                .setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a Steam64 ID from your account")
            .addStringOption((option) => option.setName("id").setDescription("Steam64 ID to remove").setRequired(true))
        )
    )

    // /invenchecker item add <name>
    // /invenchecker item remove <name>
    .addSubcommandGroup((group) =>
      group
        .setName("item")
        .setDescription("Manage custom tracked items")
        .addSubcommand((sub) =>
          sub
            .setName("add")
            .setDescription("Add a custom item to track")
            .addStringOption((option) =>
              option.setName("name").setDescription("market_hash_name of the item").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a custom tracked item")
            .addStringOption((option) =>
              option.setName("name").setDescription("market_hash_name of the item").setRequired(true)
            )
        )
    )

    // /invenchecker alerts list
    // /invenchecker alerts resolve
    .addSubcommandGroup((group) =>
      group
        .setName("alerts")
        .setDescription("Manage your price alerts")
        .addSubcommand((sub) => sub.setName("list").setDescription("List your unresolved alerts"))
        .addSubcommand((sub) => sub.setName("resolve").setDescription("Resolve all your unresolved alerts"))
    )

    // /invenchecker view summary
    // /invenchecker view progress
    // /invenchecker view prices [days] [item]
    .addSubcommandGroup((group) =>
      group
        .setName("view")
        .setDescription("View account data and prices")
        .addSubcommand((sub) =>
          sub.setName("summary").setDescription("Inventory summary with latest prices per tracked item")
        )
        .addSubcommand((sub) => sub.setName("progress").setDescription("Scan state per Steam account and custom item"))
        .addSubcommand((sub) =>
          sub
            .setName("prices")
            .setDescription("Price history for your custom tracked items")
            .addIntegerOption((option) =>
              option
                .setName("days")
                .setDescription("Number of days of history to return (default: 7)")
                .setMinValue(1)
                .setMaxValue(365)
                .setRequired(false)
            )
            .addStringOption((option) =>
              option.setName("item").setDescription("Filter to a single item by market_hash_name").setRequired(false)
            )
        )
    ),

  async execute(interaction) {
    const subcommand = `${interaction.options.getSubcommandGroup()} ${interaction.options.getSubcommand()}`;
    try {
      if (subcommand === "account register") {
        await register(interaction);
        return;
      }
      const uid = await getUid(interaction.user.id);
      if (!uid) {
        await interaction.reply(NO_ACCOUNT_REPLY);
        return;
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await interaction.editReply(await ACCOUNT_HANDLERS[subcommand](interaction, uid));
    } catch (err) {
      logger.warn({ err, subcommand }, "invenchecker - command failed");
      const content = describeApiError(err);
      if (interaction.deferred) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
      }
    }
  },

  // Page buttons: "invenchecker:<view>:<page>:<days>". The view is loaded again for the user who
  // clicked, so the buttons keep working after a restart.
  async handleButton(interaction, [view, page, days]) {
    if (!VIEWS[view]) return;
    const uid = await getUid(interaction.user.id);
    if (!uid) {
      await interaction.reply(NO_ACCOUNT_REPLY);
      return;
    }
    await interaction.deferUpdate();
    try {
      const options = { days: Number(days) || DEFAULT_PRICE_DAYS };
      await interaction.editReply(await renderView(view, uid, Number(page), options));
    } catch (err) {
      logger.warn({ err, view }, "invenchecker - page failed");
      await interaction.followUp({ content: describeApiError(err), flags: MessageFlags.Ephemeral });
    }
  }
};

// Registration needs DMs open, because that's where price alerts are sent
async function register(interaction) {
  const existing = await getUid(interaction.user.id);
  if (existing) {
    await interaction.reply({ content: `Already registered (uid: \`${existing}\`).`, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    await interaction.user.send("Verifying DMs for invenchecker registration…");
  } catch {
    await interaction.editReply({
      content: "Registration failed: please enable DMs from server members so invenchecker can send you price alerts."
    });
    return;
  }
  const { uid } = await createAccountByDiscord(interaction.user.id);
  await setUid(interaction.user.id, uid);
  await interaction.editReply({ content: `Registered! Your uid: \`${uid}\`` });
}

async function steamAdd(interaction, uid) {
  const id = interaction.options.getString("id");
  if (!STEAM64_ID.test(id)) return { content: "That isn't a Steam64 ID. It should be 17 digits." };
  const account = await addSteam64Id(uid, id);
  return { content: `Added \`${id}\`. Steam64 IDs: ${account.steam64ids.join(", ")}` };
}

async function steamRemove(interaction, uid) {
  const id = interaction.options.getString("id");
  const account = await removeSteam64Id(uid, id);
  return { content: `Removed \`${id}\`. Remaining: ${listOrNone(account.steam64ids)}` };
}

async function itemAdd(interaction, uid) {
  const name = interaction.options.getString("name");
  const account = await addCustomItem(uid, name);
  return { content: `Added \`${name}\`. Tracked items: ${account.customItems.join(", ")}` };
}

async function itemRemove(interaction, uid) {
  const name = interaction.options.getString("name");
  const account = await removeCustomItem(uid, name);
  return { content: `Removed \`${name}\`. Remaining: ${listOrNone(account.customItems)}` };
}

async function alertsResolve(_interaction, uid) {
  const { resolved } = await resolveAllAlerts(uid);
  return { content: `Resolved ${resolved} alert(s).` };
}

// Renders one page of a view, with page buttons when it runs over one embed. An item filter on
// prices isn't kept in the button id, so filtered prices only show their first page (a single
// item is always one page).
async function renderView(view, uid, requestedPage = 0, options = {}) {
  const { title, colour, lines, sections, empty, emptyAsText } = await VIEWS[view](uid, options);
  const pages = lines ? chunkLines(lines, EMBED_DESCRIPTION_LIMIT) : paginateFields(sectionsToFields(sections));
  const embed = new EmbedBuilder().setTitle(title).setColor(colour).setTimestamp();
  if (pages.length === 0) {
    return emptyAsText
      ? { content: empty, embeds: [], components: [] }
      : { embeds: [embed.setDescription(empty)], components: [] };
  }
  const page = clampPage(requestedPage, pages.length);
  if (lines) embed.setDescription(pages[page]);
  else embed.addFields(pages[page]);
  const components = options.item
    ? []
    : buildPageButtons((target) => `invenchecker:${view}:${target}:${options.days ?? ""}`, page, pages.length);
  return { content: "", embeds: [embed], components };
}

async function loadAlertsView(uid) {
  const alerts = await getUserAlerts(uid);
  return {
    title: "Unresolved Alerts",
    colour: ALERT_COLOUR,
    lines: alerts.map(formatAlert),
    empty: "No unresolved alerts.",
    emptyAsText: true
  };
}

async function loadSummaryView(uid) {
  const summary = await getAccountSummary(uid);
  const steamSections = Object.entries(summary.steam64ids || {}).map(([steam64id, items]) => ({
    name: steam64id,
    lines: items.map(
      (item) => `\`${item.market_hash_name}\` — ${formatLowestPrice(item)}${item.missing ? " *(missing)*" : ""}`
    )
  }));
  const customSection = {
    name: "Custom Items",
    lines: (summary.customItems || []).map((item) => `\`${item.market_hash_name}\` — ${formatLowestPrice(item)}`)
  };
  return {
    title: "Inventory Summary",
    colour: SUMMARY_COLOUR,
    sections: [...steamSections, customSection],
    empty: "No tracked items found."
  };
}

async function loadProgressView(uid) {
  const progress = await getAccountProgress(uid);
  const steamLines = Object.entries(progress.steam64ids || {}).map(([id, state]) =>
    formatScanState(id, state, state.lastFetch?.fetched_at, "never fetched")
  );
  const itemLines = Object.entries(progress.customItems || {}).map(([name, state]) =>
    formatScanState(name, state, state.lastPrice?.captured_at, "never priced")
  );
  return {
    title: "Scan Progress",
    colour: PROGRESS_COLOUR,
    sections: [
      { name: "Steam Accounts", lines: steamLines },
      { name: "Custom Items", lines: itemLines }
    ],
    empty: "No tracked items found."
  };
}

async function loadPricesView(uid, { days = DEFAULT_PRICE_DAYS, item = null }) {
  const prices = await getAccountPrices(uid, days, item);
  const sections = Object.entries(prices).map(([name, snapshots]) => ({
    name,
    lines: snapshots.slice(-10).map((snapshot) => {
      const date = new Date(snapshot.captured_at * 1000).toLocaleDateString();
      const low = snapshot.lowest_price != null ? formatPrice(snapshot.lowest_price) : "—";
      const median = snapshot.median_price != null ? formatPrice(snapshot.median_price) : "—";
      return `${date}: ${low} low / ${median} med`;
    })
  }));
  return { title: `Price History (${days}d)`, colour: PRICES_COLOUR, sections, empty: "No price data found." };
}

function formatLowestPrice(item) {
  return item.price?.lowest_price != null ? formatPrice(item.price.lowest_price) : "no price";
}

// "`name` — queued", or "`name` — last: <relative time>, next: <relative time>"
function formatScanState(name, state, lastAt, neverLabel) {
  if (state.queued) return `\`${name}\` — queued`;
  const last = lastAt ? `last: <t:${lastAt}:R>` : neverLabel;
  const next = state.nextScanAt ? `, next: <t:${state.nextScanAt}:R>` : "";
  return `\`${name}\` — ${last}${next}`;
}

function listOrNone(values) {
  return values.length ? values.join(", ") : "none";
}

function describeApiError(err) {
  if (err.status === 404) return "Account not found. Try `/invenchecker account register` again.";
  if (err.status === 409) return "Account already exists on the server.";
  return `API error: ${err.message}`;
}
