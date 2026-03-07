const { createChannelCommand } = require("utils/createChannelCommand");

module.exports = createChannelCommand({
  name: "clearchannel",
  description: "Manage channels in the daily message clear",
  key: "clearChannels",
  addDescription: "DANGEROUS — add a channel to be cleared of all messages daily at 05:00 UTC"
});
