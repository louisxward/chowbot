const { createChannelCommand } = require("utils/createChannelCommand");

module.exports = createChannelCommand({
  name: "leaderboardchannel",
  description: "Manage channels where the karma leaderboard is posted",
  key: "leaderboardChannels"
});
