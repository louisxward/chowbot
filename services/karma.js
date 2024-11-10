const fs = require("fs/promises");

const dataFilePath = "./data/karma.json";
const encoding = "utf8";

async function updateUserKarma(userId, value) {
  try {
    let data = {};
    try {
      const fileContent = await fs.readFile(dataFilePath, encoding);
      data = JSON.parse(fileContent);
    } catch (error) {
      console.log(error);
    }
    data[userId] = data[userId] + value;
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
  }
}

async function getUserKarma(userId) {
  try {
    const fileContent = await fs.readFile(dataFilePath, encoding);
    const data = JSON.parse(fileContent);
    return data[userId];
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = { updateUserKarma, getUserKarma };
