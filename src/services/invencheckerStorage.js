const { readFile, writeFile } = require("services/storageHelper");
const { USER_CONFIG_PATH } = require("config");

async function getUid(userId) {
  const config = await readFile(USER_CONFIG_PATH);
  return config[userId]?.invencheckerId ?? null;
}

async function setUid(userId, uid) {
  const config = await readFile(USER_CONFIG_PATH);
  config[userId] = { ...config[userId], invencheckerId: uid };
  await writeFile(USER_CONFIG_PATH, config);
}

module.exports = { getUid, setUid };
