const express = require("express");
const { connect } = require("services/databaseService");

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

module.exports = { getStatus };
