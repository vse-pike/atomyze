import { createLogger, format, transports } from "winston";

export const chatLogger = createLogger({
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf((info) => `${info.timestamp}: ${info.message}`),
  ),
  transports: [new transports.File({ filename: "logs/chat_activity.log" })],
});
