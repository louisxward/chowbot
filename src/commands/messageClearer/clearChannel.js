const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { addServerClearChannel, removeServerClearChannel, getServerClearChannels } = require("services/messageClearer");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearchannel")
    .setDescription("Manage channels in the daily message clear")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("DANGEROUS — add a channel to be cleared of all messages daily at 05:00 UTC")
        .addStringOption((opt) =>
          opt.setName("channel_id").setDescription("ID of the channel").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a channel from the daily clear list")
        .addStringOption((opt) =>
          opt.setName("channel_id").setDescription("ID of the channel").setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List channels currently in the daily clear list")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    try {
      if (sub === "add") {
        const channelId = interaction.options.getString("channel_id");
        await addServerClearChannel(interaction.client, interaction.guildId, channelId);
        return interaction.editReply({ content: "Channel added to clear list" });
      }

      if (sub === "remove") {
        const channelId = interaction.options.getString("channel_id");
        await removeServerClearChannel(interaction.guildId, channelId);
        return interaction.editReply({ content: "Channel removed from clear list" });
      }

      if (sub === "list") {
        const channels = await getServerClearChannels(interaction.guildId);
        if (!channels.length) {
          return interaction.editReply({ content: "No channels in the clear list." });
        }
        return interaction.editReply({ content: `Clear channels:\n${channels.map((id) => `<#${id}>`).join("\n")}` });
      }
    } catch (err) {
      if (interaction.deferred) {
        return interaction.editReply({ content: `Failed: ${err.message}` });
      }
      return interaction.reply({ ephemeral: true, content: `Failed: ${err.message}` });
    }
  }
};
