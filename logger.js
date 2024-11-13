const pino = require("pino");

const logger = pino({
  level: "info",
  transport: {
    //target: "pino-pretty",
    target: "pino/file",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      destination: "chowbot.log",
    },
  },
});

module.exports = logger;
