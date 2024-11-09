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

// Event
// Boot up ChowBot
client.once(Events.ClientReady, (ready) => {
  console.log(`${ready.user.tag} INITIALISED`);
});

// Event
// Reddit React to Image/Video. !Only checks first attachment!
client.on(Events.MessageCreate, (messageCreate) => {
  console.log("redditReact - heard");
  if (messageCreate.attachments.size == 0) return;
  if (null == contentType) return;
  if (contentType.includes("image") || contentType.includes("video")) {
    console.log("redditReact - content detected must react");
    messageCreate
      .react("1304553163512352788")
      .then(() => messageCreate.react("1304553174509817957"))
      .catch((error) => console.error("redditReact - failed to react :(", error));
  }
});

client.login(process.env.DISCORD_TOKEN);
