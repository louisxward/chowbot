import { Client, IntentsBitField, Message } from "discord.js";
require("dotenv").config();

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on("messageCreate", (message: Message) => {
  if (message.author.bot) return; // Ignore messages from bots

  if (message.content.startsWith("!ping")) {
    message.reply("Pong!");
  }
});

client.login(process.env.DISCORD_TOKEN);
