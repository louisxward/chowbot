const { Events } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,
  execute(message) {
    console.log("redditReact - heard");
    if (message.attachments.size == 0) return;
    const contentType = message.attachments.first().contentType;
    if (null == contentType) return;
    if (contentType.includes("image") || contentType.includes("video")) {
      console.log("redditReact - content detected must react");
      message
        .react("1304553163512352788")
        .then(() => message.react("1304553174509817957"))
        .catch((error) => console.error("redditReact - failed to react :(", error));
    }
  },
};