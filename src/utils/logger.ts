/**
 * Logger utility for tracking application events and errors
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Set the current log level based on environment
const currentLogLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.WARN  // Only warnings and errors in production
  : LogLevel.DEBUG; // All logs in development

interface LogPayload {
  message: string;
  level: LogLevel;
  context?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private formatPayload(payload: LogPayload): string {
    const { message, level, context, timestamp } = payload;
    const levelName = LogLevel[level];
    
    let formattedMessage = `[${timestamp}] [${levelName}] ${message}`;
    
    if (context) {
      formattedMessage += ` ${JSON.stringify(context)}`;
    }
    
    return formattedMessage;
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Skip logging if the current level is higher than the log level
    if (level < currentLogLevel) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const payload: LogPayload = {
      message,
      level,
      context,
      timestamp,
    };
    
    const formattedMessage = this.formatPayload(payload);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
    
    // Here we could also send logs to a server or other logging service
  }
  
  public debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  public info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  public warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  public error(message: string, error?: any, context?: Record<string, any>): void {
    let errorContext = context || {};
    
    // Extract information from the error object
    if (error) {
      errorContext = {
        ...errorContext,
        error: {
          message: error.message,
          stack: error.stack,
          ...error,
        },
      };
    }
    
    this.log(LogLevel.ERROR, message, errorContext);
  }
}

// Create and export a singleton instance
const logger = new Logger();
export default logger; 