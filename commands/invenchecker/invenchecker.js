const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { getUid, setUid } = require("services/invencheckerStorage");
const {
  createAccountByDiscord,
  addSteam64Id,
  removeSteam64Id,
  addCustomItem,
  removeCustomItem,
  resolveAllAlerts,
  getUserAlerts
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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    // /invenchecker account register
    .addSubcommandGroup((group) =>
      group
        .setName("account")
        .setDescription("Account management")
        .addSubcommand((sub) =>
          sub
            .setName("register")
            .setDescription("Register your Discord account with invenchecker")
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
            .addStringOption((opt) =>
              opt.setName("id").setDescription("Steam64 ID").setRequired(true)
            )
        )
        .addSubcommand((sub) =>
          sub
            .setName("remove")
            .setDescription("Remove a Steam64 ID from your account")
            .addStringOption((opt) =>
              opt.setName("id").setDescription("Steam64 ID to remove").setRequired(true)
            )
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
        .addSubcommand((sub) =>
          sub.setName("list").setDescription("List your unresolved alerts")
        )
        .addSubcommand((sub) =>
          sub.setName("resolve").setDescription("Resolve all your unresolved alerts")
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    if (group === "account" && sub === "register") {
      const existing = await getUid(interaction.user.id);
      if (existing) {
        return interaction.reply({ ephemeral: true, content: `Already registered (uid: \`${existing}\`).` });
      }
      await interaction.deferReply({ ephemeral: true });
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
        return interaction.editReply({ content: `Added \`${name}\`. Tracked items: ${account.customItems.join(", ")}` });
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
              .map((a) => `**${a.market_hash_name}** — +${a.spike_pct.toFixed(1)}% @ $${a.price_at_alert.toFixed(2)}`)
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
  }
};
