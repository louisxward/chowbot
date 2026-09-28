const express = require("express");
const { getStatus } = require("services/healthService");

const router = express.Router();

// 200 when healthy, 503 otherwise. Used by the Docker healthcheck, so it needs no auth.
router.get("/", async (req, res) => {
  const { status } = await getStatus(req.app.get("client"));
  res.status(status === "ok" ? 200 : 503).json({ status });
});

module.exports = router;
