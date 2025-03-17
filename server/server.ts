import express, { Request, Response, NextFunction, Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import logger from './utils/logger';

// Load environment variables
dotenv.config({ path: path.resolve('.env') });

// Create Express app
const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.url}`, { 
    ip: req.ip, 
    userAgent: req.headers['user-agent'] 
  });
  next();
});

// API routes will be imported here
// app.use('/api/auth', authRoutes);
// app.use('/api/canvas', canvasRoutes);
// app.use('/api/claude', claudeRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  logger.error(`Error ${statusCode}: ${err.message}`, { stack: err.stack });
  res.status(statusCode).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Export app for testing
export default app; 