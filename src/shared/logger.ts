/**
 * Logger configuration using Pino.
 * Provides structured logging with file output and pretty console output.
 */

import pino from "pino";

const LOG_DIR = process.cwd();
const LOG_FILE = "pax-automata.log";

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  },
  pino.transport({
    targets: [
      {
        target: "pino/file",
        options: {
          destination: `${LOG_DIR}/${LOG_FILE}`,
          mkdir: true,
        },
      },
      {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    ],
  })
);
