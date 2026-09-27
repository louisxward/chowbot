const { getDb } = require("services/databaseService");
const logger = require("logger");

async function getStatus(client) {
  const ready = client?.isReady() ?? false;

  let db = "ok";
  try {
    getDb().prepare("select * from server limit 1").get();
  } catch (error) {
    logger.error(error);
    db = "error";
  }
  const result = {
    status: ready && db === "ok" ? "ok" : "degraded",
    ready,
    uptime: Math.floor(process.uptime()),
    ping: client?.ws?.ping ?? -1,
    db
  };
  return result;
}

module.exports = { getStatus };
