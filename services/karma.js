const fs = require("fs/promises");

const dataFilePath = "./data/karma.json"; // Path to your JSON data file

async function updateUserKarma(userId, count) {
  try {
    // 1. Read existing data from the file
    let data = {};
    try {
      const fileContent = await fs.readFile(dataFilePath, "utf8");
      data = JSON.parse(fileContent);
    } catch (readError) {
      // If the file doesn't exist or is empty, start with an empty object
      if (readError.code !== "ENOENT") {
        console.error("Error reading data file:", readError);
      }
    }
    // 2. Update the data with the new key-value pair
    data[userId] = count;
    // 3. Write the updated data back to the file
    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2)); // Use null, 2 for pretty printing
  } catch (error) {
    console.error("Error storing data:", error);
  }
}

async function getUserKarma(userId) {
  try {
    const fileContent = await fs.readFile(dataFilePath, "utf8");
    const data = JSON.parse(fileContent);
    return data[userId];
  } catch (error) {
    console.error("Error getting data:", error);
    return null;
  }
}

module.exports = { updateUserKarma, getUserKarma };
