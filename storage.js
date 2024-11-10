const { Keyv } = require("keyv");
const { KeyvFile } = require("keyv-file");

const keyv = new Keyv({ store: new KeyvFile({ filename: "./karmaCounter.json" }) });

async function storeData(messageId, count) {
  await keyv.set(messageId, count);
}

async function retrieveData(messageId) {
  const count = await keyv.get(messageId);
  return count;
}

module.exports = { storeData, retrieveData };
