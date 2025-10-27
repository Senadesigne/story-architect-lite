import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z, ZodError } from 'zod';
import { validateBody, getValidatedBody } from '@/middleware/validation';
import { 
  requireValidUUID, 
  requireProjectOwnership, 
  requireResourceOwnership, 
  ValidationError, 
  NotFoundError 
} from '@/middleware/errorHandler';
import { UpdateUserBodySchema } from '@/schemas/validation';
import { createMockUser, createMockProject } from '@/test/helpers';
import { getDatabase } from '@/lib/db';

// Mock the database
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn()
}));

describe('validation middleware', () => {
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    // Reset mocks before each test
    mockNext = vi.fn();
    mockContext = {
      req: {
        json: vi.fn(),
        param: vi.fn()
      },
      set: vi.fn(),
      get: vi.fn(),
      var: {}
    };
    
    vi.clearAllMocks();
  });

  describe('validateBody', () => {
    it('should validate valid request body and call next()', async () => {
      const validBody = { displayName: 'John Doe' };
      mockContext.req.json.mockResolvedValueOnce(validBody);
      
      const middleware = validateBody(UpdateUserBodySchema);
      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', validBody);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw ValidationError for invalid request body', async () => {
      const invalidBody = { displayName: 123 }; // displayName should be string
      mockContext.req.json.mockResolvedValueOnce(invalidBody);
      
      const middleware = validateBody(UpdateUserBodySchema);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should format ZodError messages properly', async () => {
      const invalidBody = { avatarUrl: 'invalid-url' }; // avatarUrl should be valid URL
      mockContext.req.json.mockResolvedValueOnce(invalidBody);
      
      const middleware = validateBody(UpdateUserBodySchema);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow();
    });

    it('should handle empty body when schema allows optional fields', async () => {
      const emptyBody = {};
      mockContext.req.json.mockResolvedValueOnce(emptyBody);
      
      const middleware = validateBody(UpdateUserBodySchema);
      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', emptyBody);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should re-throw non-ZodError errors', async () => {
      const jsonError = new Error('JSON parsing failed');
      mockContext.req.json.mockRejectedValueOnce(jsonError);
      
      const middleware = validateBody(UpdateUserBodySchema);

      await expect(middleware(mockContext, mockNext)).rejects.toThrow('JSON parsing failed');
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('getValidatedBody', () => {
    it('should return validated body from context', () => {
      const validatedData = { displayName: 'John Doe' };
      mockContext.get.mockReturnValueOnce(validatedData);

      const result = getValidatedBody(mockContext);

      expect(mockContext.get).toHaveBeenCalledWith('validatedBody');
      expect(result).toEqual(validatedData);
    });
  });

  describe('requireValidUUID', () => {
    it('should not throw error for valid UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      
      expect(() => requireValidUUID(validUUID)).not.toThrow();
    });

    it('should throw ValidationError for invalid UUID', () => {
      const invalidUUID = '123';
      
      expect(() => requireValidUUID(invalidUUID)).toThrow(ValidationError);
      expect(() => requireValidUUID(invalidUUID)).toThrow('Invalid ID format');
    });

    it('should throw ValidationError with custom field name', () => {
      const invalidUUID = 'invalid-project-id';
      
      expect(() => requireValidUUID(invalidUUID, 'Project ID')).toThrow('Invalid Project ID format');
    });

    it('should handle empty string', () => {
      expect(() => requireValidUUID('')).toThrow(ValidationError);
    });

    it('should handle null/undefined values', () => {
      expect(() => requireValidUUID(null as any)).toThrow(ValidationError);
      expect(() => requireValidUUID(undefined as any)).toThrow(ValidationError);
    });
  });

  describe('requireProjectOwnership', () => {
    let mockDb: any;

    beforeEach(() => {
      mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      };
      (getDatabase as vi.Mock).mockReturnValue(mockDb);
    });

    it('should not throw error when user owns the project', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      const mockProject = createMockProject({ id: 'project-abc', userId: 'user-123' });
      
      mockDb.where.mockResolvedValueOnce([{ id: 'project-abc' }]);

      await expect(
        requireProjectOwnership(mockDb, 'project-abc', 'user-123')
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundError when user does not own the project', async () => {
      mockDb.where.mockResolvedValueOnce([]); // Empty result = project not found

      await expect(
        requireProjectOwnership(mockDb, 'project-abc', 'user-123')
      ).rejects.toThrow(NotFoundError);
      
      await expect(
        requireProjectOwnership(mockDb, 'project-abc', 'user-123')
      ).rejects.toThrow('Project not found');
    });

    it('should throw NotFoundError when project does not exist', async () => {
      mockDb.where.mockResolvedValueOnce([]); // Empty result

      await expect(
        requireProjectOwnership(mockDb, 'non-existent-project', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('requireResourceOwnership', () => {
    let mockDb: any;
    let mockResourceTable: any;

    beforeEach(() => {
      mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      };
      
      mockResourceTable = {
        id: 'resource_id_column',
        projectId: 'project_id_column'
      };
      
      (getDatabase as vi.Mock).mockReturnValue(mockDb);
    });

    it('should not throw error when user owns the resource through project', async () => {
      mockDb.where.mockResolvedValueOnce([{ id: 'resource-123' }]);

      await expect(
        requireResourceOwnership(mockDb, mockResourceTable, 'resource-123', 'user-123')
      ).resolves.not.toThrow();
    });

    it('should throw NotFoundError when user does not own the resource', async () => {
      mockDb.where.mockResolvedValueOnce([]); // Empty result

      await expect(
        requireResourceOwnership(mockDb, mockResourceTable, 'resource-123', 'user-123')
      ).rejects.toThrow(NotFoundError);
      
      await expect(
        requireResourceOwnership(mockDb, mockResourceTable, 'resource-123', 'user-123')
      ).rejects.toThrow('Resource not found');
    });

    it('should throw NotFoundError when resource does not exist', async () => {
      mockDb.where.mockResolvedValueOnce([]); // Empty result

      await expect(
        requireResourceOwnership(mockDb, mockResourceTable, 'non-existent-resource', 'user-123')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete validation flow', async () => {
      const validBody = { displayName: 'Updated Name' };
      mockContext.req.json.mockResolvedValueOnce(validBody);
      
      const middleware = validateBody(UpdateUserBodySchema);
      await middleware(mockContext, mockNext);

      // Verify the body was validated and stored
      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', validBody);
      expect(mockNext).toHaveBeenCalled();

      // Verify we can retrieve the validated body
      mockContext.get.mockReturnValueOnce(validBody);
      const retrievedBody = getValidatedBody(mockContext);
      expect(retrievedBody).toEqual(validBody);
    });

    it('should handle validation with multiple fields', async () => {
      const complexBody = {
        displayName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg'
      };
      mockContext.req.json.mockResolvedValueOnce(complexBody);
      
      const middleware = validateBody(UpdateUserBodySchema);
      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', complexBody);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle validation with empty avatar URL', async () => {
      const bodyWithEmptyAvatar = {
        displayName: 'John Doe',
        avatarUrl: '' // Empty string should be allowed
      };
      mockContext.req.json.mockResolvedValueOnce(bodyWithEmptyAvatar);
      
      const middleware = validateBody(UpdateUserBodySchema);
      await middleware(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('validatedBody', bodyWithEmptyAvatar);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
