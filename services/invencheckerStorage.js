const { readFile, writeFile } = require("services/storageHelper");
const { INVENCHECKER_STATE_PATH } = require("config");

async function getUid(userId) {
  const state = await readFile(INVENCHECKER_STATE_PATH);
  return state[userId] ?? null;
}

async function setUid(userId, uid) {
  const state = await readFile(INVENCHECKER_STATE_PATH);
  state[userId] = uid;
  await writeFile(INVENCHECKER_STATE_PATH, state);
}

module.exports = { getUid, setUid };
