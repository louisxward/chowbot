// ChowIndustries
const { Client, Events, GatewayIntentBits } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
});

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// MessageCreate
client.on(Events.MessageCreate, (messageCreate) => {
  console.log("MessageCreate");
  if (messageCreate.attachments.size > 0) {
    const firstContentType = messageCreate.attachments.first().contentType;
    console.log("contentType: " + firstContentType);
    if (null == firstContentType) return;
    if (
      firstContentType.includes("image") ||
      firstContentType.includes("video")
    ) {
      console.log("MessageCreate - has image must react");
      messageCreate.react("😄");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
