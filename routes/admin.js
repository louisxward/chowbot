const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");
const { sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const logger = require("logger");

async function clearStateRoute(_req, res) {
  await clearSessionState();
  res.json({ ok: true });
}

async function reloadConfigRoute(_req, res) {
  await reloadAppConfig();
  res.json({ ok: true });
}

function sendLeaderboardRoute(req, res) {
  sendKarmaWeeklyLeaderboard(req.app.get("client")).catch((err) =>
    logger.error({ err }, "admin - sendleaderboard failed")
  );
  res.status(202).json({ ok: true });
}

module.exports = { clearStateRoute, reloadConfigRoute, sendLeaderboardRoute };
