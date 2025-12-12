import * as winston from "winston";
import { transports, format } from "winston";

/**
 * Singleton-класс для логирования с помощью Winston.
 * Настроен на структурированное логирование (JSON) и вывод в файл/консоль.
 */
class Logger {
  private static instance: winston.Logger;
  private readonly logger: winston.Logger;

  private constructor() {
    const logLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

    const logFormat = format.combine(
      format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
    );

    const loggerTransports: winston.transport[] = [
      new transports.Console({
        format: format.combine(format.colorize(), format.simple()),
      }),

      new transports.File({
        filename: "logs/logs.log",
      }),
    ];

    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports: loggerTransports,
    });
  }

  public static getInstance(): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger().logger;
    }
    return Logger.instance;
  }
}

export const logger = Logger.getInstance();
