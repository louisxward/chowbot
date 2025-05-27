const logger = require("logger");
const sqlite3 = require("sqlite3").verbose();
const { connect } = require("services/sqlInitService");

module.exports = { updateUserKarma, getUserKarma, getKarmaLeaderboard };
