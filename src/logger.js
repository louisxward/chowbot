const pino = require("pino");

const fs = require("node:fs");
const path = require("node:path");
const { LOG_LEVEL } = require("config");

const loggerPath = path.join(__dirname, "../log");
if (!fs.existsSync(loggerPath)) {
  fs.mkdirSync(loggerPath, { recursive: true });
}

const transport = pino.transport({
  targets: [
    { target: "pino-pretty", level: LOG_LEVEL },
    {
      target: "pino-roll",
      level: LOG_LEVEL,
      options: {
        file: path.join(loggerPath, "chowbot.log"),
        frequency: "daily",
        limit: { count: 14 }
      }
    }
  ]
});

const logger = pino({ level: LOG_LEVEL }, transport);

module.exports = logger;
