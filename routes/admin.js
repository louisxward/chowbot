const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");
const { sendKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const express = require("express");
const router = express.Router();

router.post("/admin/clearstate", async (_req, res) => {
  await clearSessionState();
  res.json({ ok: true });
});

router.post("/admin/reloadconfig", async (_req, res) => {
  await reloadAppConfig();
  res.json({ ok: true });
});

router.post("/admin/sendLeaderboardRoute", async (_req, res) => {
  await sendKarmaWeeklyLeaderboard(_req.app.get("client")).catch((err) =>
    logger.error({ err }, "admin - sendleaderboard failed")
  );
  res.status(202).json({ ok: true });
});

module.exports = router;
