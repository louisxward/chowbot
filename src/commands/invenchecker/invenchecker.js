const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUid, setUid } = require("services/invencheckerStorage");
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

async function requireUid(interaction) {
  const uid = await getUid(interaction.user.id);
  if (!uid) {
    await interaction.reply({
      ephemeral: true,
      content: "No invenchecker account linked. Use `/invenchecker account register` first."
    });
    return null;
  }
  return uid;
}

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
            .addStringOption((opt) => opt.setName("id").setDescription("Steam64 ID").setRequired(true))
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a Steam64 ID from your account")
            .addStringOption((opt) => opt.setName("id").setDescription("Steam64 ID to remove").setRequired(true))
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
            .addStringOption((opt) =>
              opt.setName("name").setDescription("market_hash_name of the item").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a custom tracked item")
            .addStringOption((opt) =>
              opt.setName("name").setDescription("market_hash_name of the item").setRequired(true)
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
        .addSubcommand((sub) =>
          sub.setName("progress").setDescription("Scan state per Steam account and custom item")
        )
        .addSubcommand((sub) =>
          sub
            .setName("prices")
            .setDescription("Price history for your custom tracked items")
            .addIntegerOption((opt) =>
              opt.setName("days").setDescription("Number of days of history to return (default: 7)").setRequired(false)
            )
            .addStringOption((opt) =>
              opt
                .setName("item")
                .setDescription("Filter to a single item by market_hash_name")
                .setRequired(false)
            )
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    try {
      if (group === "account" && sub === "register") {
        const existing = await getUid(interaction.user.id);
        if (existing) {
          return interaction.reply({ ephemeral: true, content: `Already registered (uid: \`${existing}\`).` });
        }
        await interaction.deferReply({ ephemeral: true });
        try {
          await interaction.user.send("Verifying DMs for invenchecker registration…");
        } catch {
          return interaction.editReply({
            content:
              "Registration failed: please enable DMs from server members so invenchecker can send you price alerts."
          });
        }
        const result = await createAccountByDiscord(interaction.user.id);
        await setUid(interaction.user.id, result.uid);
        return interaction.editReply({ content: `Registered! Your uid: \`${result.uid}\`` });
      }

      if (group === "steam") {
        const uid = await requireUid(interaction);
        if (!uid) return;
        const id = interaction.options.getString("id");
        await interaction.deferReply({ ephemeral: true });

        if (sub === "add") {
          const account = await addSteam64Id(uid, id);
          return interaction.editReply({ content: `Added \`${id}\`. Steam64 IDs: ${account.steam64ids.join(", ")}` });
        }
        if (sub === "remove") {
          const account = await removeSteam64Id(uid, id);
          const remaining = account.steam64ids.length ? account.steam64ids.join(", ") : "none";
          return interaction.editReply({ content: `Removed \`${id}\`. Remaining: ${remaining}` });
        }
      }

      if (group === "item") {
        const uid = await requireUid(interaction);
        if (!uid) return;
        const name = interaction.options.getString("name");
        await interaction.deferReply({ ephemeral: true });

        if (sub === "add") {
          const account = await addCustomItem(uid, name);
          return interaction.editReply({
            content: `Added \`${name}\`. Tracked items: ${account.customItems.join(", ")}`
          });
        }
        if (sub === "remove") {
          const account = await removeCustomItem(uid, name);
          const remaining = account.customItems.length ? account.customItems.join(", ") : "none";
          return interaction.editReply({ content: `Removed \`${name}\`. Remaining: ${remaining}` });
        }
      }

      if (group === "alerts") {
        const uid = await requireUid(interaction);
        if (!uid) return;
        await interaction.deferReply({ ephemeral: true });

        if (sub === "list") {
          const alerts = await getUserAlerts(uid);
          if (!alerts.length) {
            return interaction.editReply({ content: "No unresolved alerts." });
          }
          const embed = new EmbedBuilder()
            .setTitle("Unresolved Alerts")
            .setColor(0xffa500)
            .setDescription(
              alerts
                .map((a) => `**${a.market_hash_name}** — +${a.spike_pct.toFixed(1)}% @ £${a.price_at_alert.toFixed(2)}`)
                .join("\n")
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "resolve") {
          const result = await resolveAllAlerts(uid);
          return interaction.editReply({ content: `Resolved ${result.resolved} alert(s).` });
        }
      }

      if (group === "view") {
        const uid = await requireUid(interaction);
        if (!uid) return;
        await interaction.deferReply({ ephemeral: true });

        if (sub === "summary") {
          const summary = await getAccountSummary(uid);
          const embed = new EmbedBuilder().setTitle("Inventory Summary").setColor(0x00aaff).setTimestamp();

          for (const [steam64id, items] of Object.entries(summary.steam64ids || {})) {
            if (!items.length) continue;
            const lines = items.map((item) => {
              const price =
                item.price?.lowest_price != null ? `£${item.price.lowest_price.toFixed(2)}` : "no price";
              const missing = item.missing ? " *(missing)*" : "";
              return `\`${item.market_hash_name}\` — ${price}${missing}`;
            });
            embed.addFields({ name: steam64id, value: lines.join("\n").slice(0, 1024) });
          }

          const customItems = summary.customItems || [];
          if (customItems.length) {
            const lines = customItems.map((item) => {
              const price =
                item.price?.lowest_price != null ? `£${item.price.lowest_price.toFixed(2)}` : "no price";
              return `\`${item.market_hash_name}\` — ${price}`;
            });
            embed.addFields({ name: "Custom Items", value: lines.join("\n").slice(0, 1024) });
          }

          if (!embed.data.fields?.length) embed.setDescription("No tracked items found.");
          return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "progress") {
          const progress = await getAccountProgress(uid);
          const embed = new EmbedBuilder().setTitle("Scan Progress").setColor(0x00cc66).setTimestamp();

          const steamEntries = Object.entries(progress.steam64ids || {});
          if (steamEntries.length) {
            const lines = steamEntries.map(([id, p]) => {
              if (p.queued) return `\`${id}\` — queued`;
              const lastFetched = p.lastFetch?.fetched_at ? `last: <t:${p.lastFetch.fetched_at}:R>` : "never fetched";
              const nextScan = p.nextScanAt ? `, next: <t:${p.nextScanAt}:R>` : "";
              return `\`${id}\` — ${lastFetched}${nextScan}`;
            });
            embed.addFields({ name: "Steam Accounts", value: lines.join("\n").slice(0, 1024) });
          }

          const itemEntries = Object.entries(progress.customItems || {});
          if (itemEntries.length) {
            const lines = itemEntries.map(([name, p]) => {
              if (p.queued) return `\`${name}\` — queued`;
              const lastPriced = p.lastPrice?.captured_at
                ? `last: <t:${p.lastPrice.captured_at}:R>`
                : "never priced";
              const nextScan = p.nextScanAt ? `, next: <t:${p.nextScanAt}:R>` : "";
              return `\`${name}\` — ${lastPriced}${nextScan}`;
            });
            embed.addFields({ name: "Custom Items", value: lines.join("\n").slice(0, 1024) });
          }

          if (!embed.data.fields?.length) embed.setDescription("No tracked items found.");
          return interaction.editReply({ embeds: [embed] });
        }

        if (sub === "prices") {
          const days = interaction.options.getInteger("days") ?? 7;
          const item = interaction.options.getString("item");
          const prices = await getAccountPrices(uid, days, item);

          const embed = new EmbedBuilder()
            .setTitle(`Price History (${days}d)`)
            .setColor(0xffcc00)
            .setTimestamp();

          for (const [name, snapshots] of Object.entries(prices)) {
            if (!snapshots.length) continue;
            const lines = snapshots.slice(-10).map((s) => {
              const date = new Date(s.captured_at * 1000).toLocaleDateString();
              const low = s.lowest_price != null ? `£${s.lowest_price.toFixed(2)}` : "—";
              const med = s.median_price != null ? `£${s.median_price.toFixed(2)}` : "—";
              return `${date}: ${low} low / ${med} med`;
            });
            embed.addFields({ name, value: lines.join("\n").slice(0, 1024) });
          }

          if (!embed.data.fields?.length) embed.setDescription("No price data found.");
          return interaction.editReply({ embeds: [embed] });
        }
      }

    } catch (err) {
      logger.warn(err);
      const msg =
        err.status === 404
          ? "Account not found. Try `/invenchecker account register` again."
          : err.status === 409
            ? "Account already exists on the server."
            : `API error: ${err.message}`;
      if (interaction.deferred) {
        return interaction.editReply({ content: msg });
      }
      return interaction.reply({ ephemeral: true, content: msg });
    }
  }
};
