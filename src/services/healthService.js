const { connect } = require("services/databaseService");
const logger = require("logger");

async function getStatus(client) {
  const ready = client?.isReady() ?? false;

  let db = "ok";
  try {
    const conn = await connect();
    await conn.get("select * from server limit 1");
    await conn.close();
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
