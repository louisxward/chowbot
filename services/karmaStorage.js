const fs = require("fs/promises");

const dataFilePath = "./data/karma.json";
const encoding = "utf8";

async function updateUserKarma(userId, value) {
  console.log("[INFO] updateUserKarma");
  try {
    let data = {};
    try {
      const fileContent = await fs.readFile(dataFilePath, encoding);
      data = JSON.parse(fileContent);
    } catch (error) {
      if (error.code !== "ENOENT") console.log(error);
    }
    const currentKarma = data[userId];
    data[userId] = null == currentKarma ? value : currentKarma + value;
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
}

async function getUserKarma(userId) {
  console.log("[INFO] getUserKarma");
  try {
    const fileContent = await fs.readFile(dataFilePath, encoding);
    const data = JSON.parse(fileContent);
    const karma = data[userId];
    return null == karma ? 0 : karma;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function getKarmaLeaderboard(interaction) {
  console.log("[INFO] getKarmaLeaderboard");
  try {
    const fileContent = await fs.readFile(dataFilePath, encoding);
    const data = JSON.parse(fileContent);
    console.log(data);

    const hydratedMap = new Map();
    for (const [userId, karma] of Object.entries(data)) {
      const username = await interaction.client.users.fetch(userId).tag;
      hydratedMap.set(username, karma);
    }
    console.log(hydratedMap);

    const sortedMap = new Map(Array.from(hydratedMap).sort((a, b) => a[1] - b[1]));
    console.log(sortedMap);

    return hydratedMap;
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = { updateUserKarma, getUserKarma, getKarmaLeaderboard };
