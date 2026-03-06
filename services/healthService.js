const express = require("express");
const { connect } = require("services/databaseService");
const { healthRoute } = require("routes/health");
const { clearStateRoute, reloadConfigRoute, sendLeaderboardRoute } = require("routes/admin");
const config = require("config");
const logger = require("logger");

const PORT = config.PORT;

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
  const app = express();
  app.set("client", client);

  app.get("/health", healthRoute);
  app.post("/admin/clearstate", clearStateRoute);
  app.post("/admin/reloadconfig", reloadConfigRoute);
  app.post("/admin/sendleaderboard", sendLeaderboardRoute);

  server = app.listen(PORT, () => {
    logger.info(`startup - health check listening on :${PORT}`);
  });
}

module.exports = { start, getStatus };
