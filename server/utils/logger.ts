import winston from 'winston';
import path from 'path';

// Define log format
const logFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message} ${
    Object.keys(meta).length ? JSON.stringify(meta) : ''
  }`;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    logFormat
  ),
  defaultMeta: { service: 'mindmap-plus-api' },
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    
    // File transport for non-development environments
    ...(process.env.NODE_ENV !== 'development'
      ? [
          // Error log
          new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
          // Combined log
          new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Export logger
export default logger; 