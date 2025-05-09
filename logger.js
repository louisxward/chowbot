const pino = require("pino");

const transport = pino.transport({
  targets: [{ target: "pino-pretty" }, { target: "pino/file", options: { destination: "./log/chowbot.log" } }]
});

const logger = pino(transport);

module.exports = logger;
