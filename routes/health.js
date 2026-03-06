const { getStatus } = require("services/healthService");

async function healthRoute(req, res) {
  const status = await getStatus(req.app.get("client"));
  const code = status.status === "ok" ? 200 : 503;
  res.status(code).json(status);
}

module.exports = { healthRoute };
