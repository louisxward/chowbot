const express = require("express");
const router = express.Router();
const { getStatus } = require("services/healthService");

router.get("/health", async (_req, res) => {
  const status = await getStatus(_req.app.get("client"));
  if (status.status !== "ok") {
    res.status(503).json({ status: status.status });
    return;
  }
  res.json({ status: "ok" });
});

router.use("/admin", require("./admin"));

module.exports = router;
