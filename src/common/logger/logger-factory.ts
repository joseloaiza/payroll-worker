// src/logger/logger-factory.ts
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

export const LoggerFactory = (appName: string) => {
  let consoleFormat;
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';

  const logDir = isProduction
    ? '/tmp/logs' // Azure: writable directory
    : path.join(process.cwd(), 'logs'); // Local dev

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  //const DEBUG = process.env.DEBUG;
  const USE_JSON_LOGGER = process.env.USE_JSON_LOGGER;

  const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    verbose: 'gray',
    debug: 'blue',
    silly: 'Purple',
  };

  winston.addColors(colors);

  // Custom format for console output
  if (USE_JSON_LOGGER === 'true') {
    consoleFormat = winston.format.combine(
      winston.format.ms(),
      winston.format.timestamp(),
      winston.format.json(),
    );
  } else {
    consoleFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.ms(),
      winston.format.colorize({ all: true }),
      nestWinstonModuleUtilities.format.nestLike(appName, {
        colors: true,
        prettyPrint: true,
      }),
      winston.format.printf(({ timestamp, level, message, ms }) => {
        return `${timestamp} ${level} ${ms}: ${message}`;
      }),
    );
  }

  // Format for files (no color codes)
  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`;
    }),
  );

  // Production Transport: Error-focused with metadata
  const productionTransport = new winston.transports.DailyRotateFile({
    filename: 'errors-%DATE%.log',
    dirname: logDir,
    format: fileFormat,
    zippedArchive: true,
    maxSize: '50m',
    maxFiles: '30d',
    level: 'error',
  });

  // Development Transport: Verbose console
  const consoleTransport = new winston.transports.Console({
    format: consoleFormat,
  });

  // New transport for production console logging
  const productionConsoleTransport = new winston.transports.Console({
    format: winston.format.combine(
      // Use JSON format for production for easier parsing
      winston.format.ms(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
    // Level is info for production console logging
    level: 'info',
  });

  // Create the logger instance PROPERLY
  const transportsArray: winston.transport[] = [productionConsoleTransport];

  if (!isProduction) {
    // In development, add the colorful console transport
    transportsArray.push(consoleTransport);
  }
  // Always add the file transport, regardless of environment
  transportsArray.push(productionTransport);

  // You should also consider adding the info daily rotate file in production as well
  transportsArray.push(
    new winston.transports.DailyRotateFile({
      filename: 'app-%DATE%.log',
      dirname: logDir,
      format: fileFormat,
      maxSize: '100m',
      maxFiles: '7d',
    }),
  );

  // Create the logger instance PROPERLY
  return {
    level: isProduction ? 'info' : 'debug',
    transports: transportsArray, //[
    //   ...(isProduction ? [productionTransport] : [consoleTransport]),
    //   // Additional info logs in develop (separate file)
    //   ...(!isProduction
    //     ? [
    //         new winston.transports.DailyRotateFile({
    //           filename: 'app-%DATE%.log',
    //           dirname: logDir,
    //           format: fileFormat,
    //           maxSize: '100m',
    //           maxFiles: '7d',
    //         }),
    //       ]
    //     : []),
    //],
    exceptionHandlers: [
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'exceptions.log'),
      }),
    ],
    rejectionHandlers: [
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, 'rejections.log'),
      }),
    ],
  };
};
