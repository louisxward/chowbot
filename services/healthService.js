const http = require("http");
const { connect } = require("services/databaseService");
const logger = require("logger");

const PORT = process.env.HEALTH_PORT || 3000;

let server;

async function getStatus(client) {
  const ready = client?.isReady() ?? false;

  let db = "ok";
  try {
    const conn = await connect();
    await conn.get("SELECT 1");
    await conn.close();
  } catch {
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

function start(client) {
  server = http.createServer(async (req, res) => {
    if (req.method !== "GET" || req.url !== "/health") {
      res.writeHead(404).end();
      return;
    }

    const status = await getStatus(client);
    const code = status.status === "ok" ? 200 : 503;
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(status));
  });

  server.listen(PORT, () => {
    logger.info(`startup - health check listening on :${PORT}`);
  });
}

module.exports = { start, getStatus };
