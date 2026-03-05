const pino = require("pino");

const fs = require("node:fs");
const path = require("node:path");

const loggerPath = path.join(__dirname, "log");
if (!fs.existsSync(loggerPath)) {
  fs.mkdirSync(loggerPath, { recursive: true });
}

const transport = pino.transport({
  targets: [
    { target: "pino-pretty" },
    {
      target: "pino-roll",
      options: {
        file: "./log/chowbot.log",
        frequency: "daily",
        limit: { count: 14 }
      }
    }
  ]
});

const logger = pino(transport);

module.exports = logger;
