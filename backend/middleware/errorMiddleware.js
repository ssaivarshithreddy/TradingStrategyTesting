import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

export default function errorMiddleware(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'An unexpected error occurred on the server.';
  let details = err.details || null;

  // Log error stack trace
  logger.error(`[EXPRESS ERROR] ${statusCode} - ${message}\nStack: ${err.stack}`);

  // In production, mask non-operational database/server errors for security
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = 'Internal server error.';
    details = null;
  }

  return res.status(statusCode).json({
    status,
    message,
    details,
  });
}
