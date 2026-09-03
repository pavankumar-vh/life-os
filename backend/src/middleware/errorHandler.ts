import { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors'

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // If headers have already been sent, delegate to default express error handler
  if (res.headersSent) {
    return next(err)
  }

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details
    })
  }

  // Handle Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.errors
    })
  }

  // Handle Mongoose Cast Errors (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID format',
      code: 'INVALID_ID',
    })
  }

  // Default to 500 Internal Server Error
  return res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR'
  })
}
