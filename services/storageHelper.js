const fs = require("fs/promises");

const dataFilePath = "./data/karma.json";
const encoding = "utf8";

async function readFile(filePath) {
  let data = {};
  try {
    const fileContent = await fs.readFile(filePath, encoding);
    data = JSON.parse(fileContent);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return data;
  }
}
async function writeFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

module.exports = { readFile, writeFile };
