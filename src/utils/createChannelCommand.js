const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  InteractionContextType
} = require("discord.js");
const { getChannels, addChannel, removeChannel } = require("repositories/serverChannel");

// Only allow channels in the server running the command, so one server's admins can't
// target another server's channels
function defaultValidateAdd(interaction, channel) {
  if (channel.guildId !== interaction.guildId) throw new Error("Channel must be in this server");
}

function createChannelCommand({
  name,
  description,
  type,
  addDescription,
  validateAdd = defaultValidateAdd,
  permission = PermissionFlagsBits.Administrator
}) {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(permission)
      .setContexts(InteractionContextType.Guild)
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription(addDescription ?? `Add a channel to ${description.toLowerCase()}`)
          .addChannelOption((option) =>
            option
              .setName("channel")
              .setDescription("The channel")
              .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
              .setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription(`Remove a channel from ${description.toLowerCase()}`)
          .addStringOption((option) =>
            option.setName("channel_id").setDescription("ID of the channel").setRequired(true)
          )
      )
      .addSubcommand((sub) => sub.setName("list").setDescription(`List channels in ${description.toLowerCase()}`)),

    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        if (sub === "add") {
          const channel = interaction.options.getChannel("channel", true);
          if (validateAdd) await validateAdd(interaction, channel);
          await addChannel(interaction.guildId, type, channel.id);
          return interaction.editReply({ content: "Channel added" });
        }
        if (sub === "remove") {
          const channelId = interaction.options.getString("channel_id");
          await removeChannel(interaction.guildId, type, channelId);
          return interaction.editReply({ content: "Channel removed" });
        }
        if (sub === "list") {
          const channels = await getChannels(interaction.guildId, type);
          if (!channels.length) return interaction.editReply({ content: "No channels configured." });
          return interaction.editReply({ content: channels.map((id) => `<#${id}>`).join("\n") });
        }
      } catch (err) {
        return interaction.editReply({ content: `Failed: ${err.message}` });
      }
    }
  };
}

module.exports = { createChannelCommand };
