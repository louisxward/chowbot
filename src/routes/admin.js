const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");
const { validateEmojis } = require("services/readyService");
const { sendKarmaWeeklyLeaderboard, persistKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const { deployCommands } = require("services/commandDeployer");
const express = require("express");
const router = express.Router();

router.post("/clearstate", async (_req, res) => {
  await clearSessionState();
  res.json({ ok: true });
});

router.post("/reloadconfig", async (req, res) => {
  await reloadAppConfig();
  await validateEmojis(req.app.get("client"));
  res.json({ ok: true });
});

router.post("/persistKarmaWeeklyLeaderboard", async (_req, res) => {
  await persistKarmaWeeklyLeaderboard().catch((err) =>
    logger.error({ err }, "admin - persistKarmaWeeklyLeaderboard failed")
  );
  res.status(202).json({ ok: true });
});

router.post("/sendLeaderboardRoute", async (_req, res) => {
  await sendKarmaWeeklyLeaderboard(_req.app.get("client")).catch((err) =>
    logger.error({ err }, "admin - sendleaderboard failed")
  );
  res.status(202).json({ ok: true });
});

router.post("/deploycommands", async (req, res) => {
  const { serverId } = req.body ?? {};
  await deployCommands(serverId);
  res.json({ ok: true, serverId: serverId ?? "global" });
});

module.exports = router;
