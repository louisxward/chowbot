const logger = require("logger");
const { getDb } = require("database");

// "ok" when the Discord client is ready and the database answers a query, otherwise "degraded"
async function getStatus(client) {
  const ready = client?.isReady() ?? false;
  let db = "ok";
  try {
    getDb().prepare("SELECT 1 FROM Server LIMIT 1").get();
  } catch (err) {
    logger.error({ err }, "health - database check failed");
    db = "error";
  }
  return {
    status: ready && db === "ok" ? "ok" : "degraded",
    ready,
    uptime: Math.floor(process.uptime()),
    ping: client?.ws?.ping ?? -1,
    db
  };
}

module.exports = { getStatus };
