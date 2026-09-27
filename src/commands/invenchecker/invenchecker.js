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

const STEAM64_ID = /^\d{17}$/;
const SUMMARY_COLOUR = 0x00aaff;
const PROGRESS_COLOUR = 0x00cc66;
const PRICES_COLOUR = 0xffcc00;
const FIELD_LIMIT = 1024; // Discord's embed field value limit

// Subcommands that need a linked account. Each gets (interaction, uid) after the reply is
// deferred, and returns what to edit the reply to.
const ACCOUNT_HANDLERS = {
  "steam add": steamAdd,
  "steam remove": steamRemove,
  "item add": itemAdd,
  "item remove": itemRemove,
  "alerts list": alertsList,
  "alerts resolve": alertsResolve,
  "view summary": viewSummary,
  "view progress": viewProgress,
  "view prices": viewPrices
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
        await interaction.reply({
          content: "No invenchecker account linked. Use `/invenchecker account register` first.",
          flags: MessageFlags.Ephemeral
        });
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

async function alertsList(_interaction, uid) {
  const alerts = await getUserAlerts(uid);
  if (!alerts.length) return { content: "No unresolved alerts." };
  const embed = new EmbedBuilder()
    .setTitle("Unresolved Alerts")
    .setColor(ALERT_COLOUR)
    .setDescription(alerts.map(formatAlert).join("\n"))
    .setTimestamp();
  return { embeds: [embed] };
}

async function alertsResolve(_interaction, uid) {
  const { resolved } = await resolveAllAlerts(uid);
  return { content: `Resolved ${resolved} alert(s).` };
}

async function viewSummary(_interaction, uid) {
  const summary = await getAccountSummary(uid);
  const embed = new EmbedBuilder().setTitle("Inventory Summary").setColor(SUMMARY_COLOUR).setTimestamp();
  for (const [steam64id, items] of Object.entries(summary.steam64ids || {})) {
    if (!items.length) continue;
    const lines = items.map(
      (item) => `\`${item.market_hash_name}\` — ${formatLowestPrice(item)}${item.missing ? " *(missing)*" : ""}`
    );
    embed.addFields({ name: steam64id, value: toFieldValue(lines) });
  }
  const customItems = summary.customItems || [];
  if (customItems.length) {
    const lines = customItems.map((item) => `\`${item.market_hash_name}\` — ${formatLowestPrice(item)}`);
    embed.addFields({ name: "Custom Items", value: toFieldValue(lines) });
  }
  return { embeds: [withEmptyMessage(embed, "No tracked items found.")] };
}

async function viewProgress(_interaction, uid) {
  const progress = await getAccountProgress(uid);
  const embed = new EmbedBuilder().setTitle("Scan Progress").setColor(PROGRESS_COLOUR).setTimestamp();
  const steamEntries = Object.entries(progress.steam64ids || {});
  if (steamEntries.length) {
    const lines = steamEntries.map(([id, p]) => formatScanState(id, p, p.lastFetch?.fetched_at, "never fetched"));
    embed.addFields({ name: "Steam Accounts", value: toFieldValue(lines) });
  }
  const itemEntries = Object.entries(progress.customItems || {});
  if (itemEntries.length) {
    const lines = itemEntries.map(([name, p]) => formatScanState(name, p, p.lastPrice?.captured_at, "never priced"));
    embed.addFields({ name: "Custom Items", value: toFieldValue(lines) });
  }
  return { embeds: [withEmptyMessage(embed, "No tracked items found.")] };
}

async function viewPrices(interaction, uid) {
  const days = interaction.options.getInteger("days") ?? 7;
  const item = interaction.options.getString("item");
  const prices = await getAccountPrices(uid, days, item);
  const embed = new EmbedBuilder().setTitle(`Price History (${days}d)`).setColor(PRICES_COLOUR).setTimestamp();
  for (const [name, snapshots] of Object.entries(prices)) {
    if (!snapshots.length) continue;
    const lines = snapshots.slice(-10).map((snapshot) => {
      const date = new Date(snapshot.captured_at * 1000).toLocaleDateString();
      const low = snapshot.lowest_price != null ? formatPrice(snapshot.lowest_price) : "—";
      const median = snapshot.median_price != null ? formatPrice(snapshot.median_price) : "—";
      return `${date}: ${low} low / ${median} med`;
    });
    embed.addFields({ name, value: toFieldValue(lines) });
  }
  return { embeds: [withEmptyMessage(embed, "No price data found.")] };
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

function toFieldValue(lines) {
  return lines.join("\n").slice(0, FIELD_LIMIT);
}

function withEmptyMessage(embed, message) {
  if (!embed.data.fields?.length) embed.setDescription(message);
  return embed;
}

function describeApiError(err) {
  if (err.status === 404) return "Account not found. Try `/invenchecker account register` again.";
  if (err.status === 409) return "Account already exists on the server.";
  return `API error: ${err.message}`;
}
