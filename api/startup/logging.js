require("express-async-errors");
const { createLogger, format, transports } = require("winston");

module.exports = createLogger({
  transports: [
    new transports.File({
      filename: "logFile.log",
      format: format.combine(
        format.timestamp({ format: "MMM-DD-YYYY HH:mm:ss" }),
        format.align(),
        format.printf(
          (info) => `${info.level}: ${[info.timestamp]}: ${info.message}`
        )
      ),
    }),
  ],
  exceptionHandlers: [
    new transports.Console({
      format: format.combine(format.colorize(), format.json()),
    }),
    new transports.File({ filename: "unCaughtExceptions.log" }),
  ],
  rejectionHandlers: [new transports.File({ filename: "rejections.log" })],
});
