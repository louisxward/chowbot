const crypto = require("node:crypto");
const config = require("config");
const logger = require("logger");
const { clearSessionState } = require("services/sessionStateStorage");
const { reloadAppConfig } = require("services/applicationConfigService");
const { validateEmojis } = require("services/readyService");
const { sendKarmaWeeklyLeaderboard, persistKarmaWeeklyLeaderboard } = require("services/leaderboardService");
const { deployCommands } = require("services/commandDeployer");
const express = require("express");
const router = express.Router();

// Every admin route needs "Authorization: Bearer <ADMIN_TOKEN>". Without ADMIN_TOKEN set, the
// admin API is disabled.
function requireAdminToken(req, res, next) {
  if (!config.ADMIN_TOKEN) {
    res.status(503).json({ error: "Admin API disabled: ADMIN_TOKEN is not set" });
    return;
  }
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!tokensMatch(token, config.ADMIN_TOKEN)) {
    logger.warn({ path: req.path }, "admin - rejected request with missing or wrong token");
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Constant-time comparison; hashing first makes both sides the same length
function tokensMatch(a, b) {
  const hash = (value) => crypto.createHash("sha256").update(value).digest();
  return crypto.timingSafeEqual(hash(a), hash(b));
}

router.use(requireAdminToken);

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

router.post("/sendLeaderboardRoute", async (req, res) => {
  await sendKarmaWeeklyLeaderboard(req.app.get("client")).catch((err) =>
    logger.error({ err }, "admin - sendleaderboard failed")
  );
  res.status(202).json({ ok: true });
});

router.post("/deploycommands", async (req, res) => {
  const { serverId } = req.body ?? {};
  try {
    const count = await deployCommands(serverId);
    res.json({ ok: true, serverId: serverId ?? "global", count });
  } catch (err) {
    logger.error({ err }, "admin - deploycommands failed");
    res.status(502).json({ error: `Discord rejected the deploy: ${err.message}` });
  }
});

module.exports = router;
