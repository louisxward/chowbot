const cron = require("node-cron");
const logger = require("logger");

const tasks = [];

// Runs fn on a cron expression (UTC). Errors are logged, and a run is skipped if the previous
// one is still going.
function schedule(expression, name, fn) {
  const task = cron.schedule(
    expression,
    async () => {
      try {
        logger.info({ job: name }, "scheduler - running job");
        await fn();
      } catch (err) {
        logger.error({ err, job: name }, "scheduler - job failed");
      }
    },
    { timezone: "UTC", name, noOverlap: true }
  );
  tasks.push(task);
}

function stopSchedules() {
  for (const task of tasks.splice(0)) task.stop();
}

module.exports = { schedule, stopSchedules };
