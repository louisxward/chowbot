const http = require("http");
const { connect } = require("services/databaseService");
const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");
const { sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const logger = require("logger");

const PORT = process.env.HEALTH_PORT || 33002;

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
    if (req.method === "GET" && req.url === "/health") {
      const status = await getStatus(client);
      const code = status.status === "ok" ? 200 : 503;
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
      return;
    }

    if (req.method === "POST" && req.url === "/admin/clearstate") {
      await clearSessionState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/admin/reloadconfig") {
      await reloadAppConfig();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (req.method === "POST" && req.url === "/admin/sendleaderboard") {
      sendKarmaWeeklyLeaderboard(client).catch((err) => logger.error({ err }, "admin - sendleaderboard failed"));
      res.writeHead(202, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404).end();
  });

  server.listen(PORT, () => {
    logger.info(`startup - health check listening on :${PORT}`);
  });
}

module.exports = { start, getStatus };
