const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getChannels, addChannel, removeChannel } = require("services/serverConfigStorage");

function defaultValidateAdd(client, channelId) {
  if (!client.channels.cache.get(channelId)) throw new Error("Channel doesn't exist");
}

function createChannelCommand({ name, description, key, addDescription, validateAdd = defaultValidateAdd, permission = PermissionFlagsBits.Administrator }) {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(permission)
      .addSubcommand((sub) =>
        sub
          .setName("add")
          .setDescription(addDescription ?? `Add a channel to ${description.toLowerCase()}`)
          .addStringOption((opt) =>
            opt.setName("channel_id").setDescription("ID of the channel").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName("remove")
          .setDescription(`Remove a channel from ${description.toLowerCase()}`)
          .addStringOption((opt) =>
            opt.setName("channel_id").setDescription("ID of the channel").setRequired(true)
          )
      )
      .addSubcommand((sub) =>
        sub.setName("list").setDescription(`List channels in ${description.toLowerCase()}`)
      ),

    async execute(interaction) {
      const sub = interaction.options.getSubcommand();
      await interaction.deferReply({ ephemeral: true });
      try {
        if (sub === "add") {
          const channelId = interaction.options.getString("channel_id");
          if (validateAdd) await validateAdd(interaction.client, channelId);
          await addChannel(interaction.guildId, key, channelId);
          return interaction.editReply({ content: "Channel added" });
        }
        if (sub === "remove") {
          const channelId = interaction.options.getString("channel_id");
          await removeChannel(interaction.guildId, key, channelId);
          return interaction.editReply({ content: "Channel removed" });
        }
        if (sub === "list") {
          const channels = await getChannels(interaction.guildId, key);
          if (!channels.length) return interaction.editReply({ content: "No channels configured." });
          return interaction.editReply({ content: channels.map((id) => `<#${id}>`).join("\n") });
        }
      } catch (err) {
        const msg = err.message ?? err;
        if (interaction.deferred) return interaction.editReply({ content: `Failed: ${msg}` });
        return interaction.reply({ ephemeral: true, content: `Failed: ${msg}` });
      }
    }
  };
}

module.exports = { createChannelCommand };
