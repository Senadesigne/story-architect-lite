import { Context } from 'hono';

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Centralized error handler
export const errorHandler = (err: Error, c: Context) => {
  console.error('API Error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  switch (err.name) {
    case 'ValidationError':
      return c.json({ error: err.message }, 400);
    
    case 'NotFoundError':
      return c.json({ error: err.message }, 404);
    
    case 'UnauthorizedError':
      return c.json({ error: err.message }, 401);
    
    case 'DatabaseError':
      return c.json({ error: 'Database operation failed' }, 500);
    
    // Handle JSON parsing errors
    case 'SyntaxError':
      if (err.message.includes('JSON')) {
        return c.json({ error: 'Invalid JSON in request body' }, 400);
      }
      break;
    
    // Handle UUID validation errors
    default:
      if (err.message.includes('Invalid UUID')) {
        return c.json({ error: 'Invalid ID format' }, 400);
      }
  }

  // Default error response
  return c.json({ error: 'Internal server error' }, 500);
};

// Helper function to validate UUID format
export const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Helper function to throw validation error if UUID is invalid
export const requireValidUUID = (id: string, fieldName: string = 'ID'): void => {
  if (!validateUUID(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
};
