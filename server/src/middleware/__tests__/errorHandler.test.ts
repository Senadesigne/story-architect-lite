import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZodError } from 'zod';
import { 
  errorHandler, 
  ValidationError, 
  NotFoundError, 
  UnauthorizedError, 
  DatabaseError 
} from '@/middleware/errorHandler';

describe('errorHandler', () => {
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockNext = vi.fn();
    mockContext = {
      json: vi.fn(),
      status: vi.fn(),
      req: {
        url: 'http://localhost:3000/test',
        method: 'GET'
      }
    };
    
    // Clear console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('ValidationError handling', () => {
    it('should return 400 status with error message for ValidationError', () => {
      const error = new ValidationError('Invalid input data');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid input data' }, 
        400
      );
    });
  });

  describe('NotFoundError handling', () => {
    it('should return 404 status with error message for NotFoundError', () => {
      const error = new NotFoundError('Resource not found');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Resource not found' }, 
        404
      );
    });
  });

  describe('UnauthorizedError handling', () => {
    it('should return 401 status with error message for UnauthorizedError', () => {
      const error = new UnauthorizedError('Access denied');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Access denied' }, 
        401
      );
    });
  });

  describe('DatabaseError handling', () => {
    it('should return 500 status with generic message for DatabaseError', () => {
      const error = new DatabaseError('Connection failed');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Database operation failed' }, 
        500
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should return 500 status with generic message for generic Error', () => {
      const error = new Error('Something went wrong');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Internal server error' }, 
        500
      );
    });
  });

  describe('ZodError handling', () => {
    it('should handle ZodError and format it properly', () => {
      // Create a mock ZodError
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number'
        },
        {
          code: 'too_small',
          minimum: 1,
          type: 'string',
          inclusive: true,
          exact: false,
          path: ['email'],
          message: 'String must contain at least 1 character(s)'
        }
      ]);

      const result = errorHandler(zodError, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Internal server error' }, 
        500
      );
    });
  });

  describe('SyntaxError handling', () => {
    it('should return 400 status for JSON parsing errors', () => {
      const error = new SyntaxError('Unexpected token in JSON at position 0');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid JSON in request body' }, 
        400
      );
    });

    it('should return 500 status for non-JSON SyntaxErrors', () => {
      const error = new SyntaxError('Unexpected token');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Internal server error' }, 
        500
      );
    });
  });

  describe('UUID validation errors', () => {
    it('should return 400 status for Invalid UUID errors', () => {
      const error = new Error('Invalid UUID format provided');
      const result = errorHandler(error, mockContext);

      expect(mockContext.json).toHaveBeenCalledWith(
        { error: 'Invalid ID format' }, 
        400
      );
    });
  });

  describe('Error logging', () => {
    it('should log error details to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new ValidationError('Test error');
      
      errorHandler(error, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith('API Error:', {
        name: 'ValidationError',
        message: 'Test error',
        stack: error.stack,
        url: 'http://localhost:3000/test',
        method: 'GET',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Custom error classes', () => {
    it('should create ValidationError with correct name and message', () => {
      const error = new ValidationError('Validation failed');
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error instanceof Error).toBe(true);
    });

    it('should create NotFoundError with correct name and message', () => {
      const error = new NotFoundError('Not found');
      
      expect(error.name).toBe('NotFoundError');
      expect(error.message).toBe('Not found');
      expect(error instanceof Error).toBe(true);
    });

    it('should create UnauthorizedError with correct name and message', () => {
      const error = new UnauthorizedError('Unauthorized');
      
      expect(error.name).toBe('UnauthorizedError');
      expect(error.message).toBe('Unauthorized');
      expect(error instanceof Error).toBe(true);
    });

    it('should create DatabaseError with correct name and message', () => {
      const error = new DatabaseError('Database error');
      
      expect(error.name).toBe('DatabaseError');
      expect(error.message).toBe('Database error');
      expect(error instanceof Error).toBe(true);
    });
  });
});
