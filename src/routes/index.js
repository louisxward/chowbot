const express = require("express");

const router = express.Router();

router.use("/health", require("./health"));
router.use("/admin", require("./admin"));

module.exports = router;
