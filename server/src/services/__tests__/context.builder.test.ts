import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextBuilder } from '../context.builder';
import { HTTPException } from 'hono/http-exception';
import { createMockDatabase, createMockScene, createMockCharacter, createMockLocation } from '@test/helpers';

describe('ContextBuilder', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDatabase();
  });

  describe('buildSceneContext', () => {
    it('should build scene context successfully', async () => {
      // Arrange
      const mockScene = createMockScene({
        id: 'scene-1',
        title: 'Test Scene',
        projectId: 'project-1'
      });
      
      const mockLocation = createMockLocation({
        id: 'loc-1',
        name: 'Test Location'
      });

      const mockCharacters = [
        createMockCharacter({ id: 'char-1', name: 'Character 1' }),
        createMockCharacter({ id: 'char-2', name: 'Character 2' })
      ];

      // Mock the scene query with location
      const sceneWithLocation = {
        ...mockScene,
        location: mockLocation
      };

      // Setup mocks
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockResolvedValue(sceneWithLocation)
        },
        characters: {
          findMany: vi.fn().mockResolvedValue(mockCharacters)
        }
      } as any;

      // Act
      const result = await ContextBuilder.buildSceneContext(
        'scene-1',
        mockDb as any,
        'project-1'
      );

      // Assert
      expect(result).toEqual({
        scene: sceneWithLocation,
        characters: mockCharacters,
        location: mockLocation
      });

      expect(mockDb.query.scenes.findFirst).toHaveBeenCalledWith({
        where: expect.anything(), // and(eq(...), eq(...))
        with: {
          location: true
        }
      });

      expect(mockDb.query.characters.findMany).toHaveBeenCalledWith({
        where: expect.anything() // eq(characters.projectId, 'project-1')
      });
    });

    it('should handle scene without location', async () => {
      // Arrange
      const mockScene = createMockScene({
        id: 'scene-1',
        title: 'Test Scene',
        projectId: 'project-1'
      });

      const mockCharacters = [
        createMockCharacter({ id: 'char-1', name: 'Character 1' })
      ];

      // Scene without location
      const sceneWithoutLocation = {
        ...mockScene,
        location: null
      };

      // Setup mocks
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockResolvedValue(sceneWithoutLocation)
        },
        characters: {
          findMany: vi.fn().mockResolvedValue(mockCharacters)
        }
      } as any;

      // Act
      const result = await ContextBuilder.buildSceneContext(
        'scene-1',
        mockDb as any,
        'project-1'
      );

      // Assert
      expect(result).toEqual({
        scene: sceneWithoutLocation,
        characters: mockCharacters,
        location: null
      });
    });

    it('should throw 404 for non-existent scene', async () => {
      // Arrange
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockResolvedValue(null)
        },
        characters: {
          findMany: vi.fn()
        }
      } as any;

      // Act & Assert
      await expect(
        ContextBuilder.buildSceneContext('non-existent-scene', mockDb as any, 'project-1')
      ).rejects.toThrow(HTTPException);

      // Verify characters query was not called since scene wasn't found
      expect(mockDb.query.characters.findMany).not.toHaveBeenCalled();
    });

    it('should throw 404 for scene from different project', async () => {
      // Arrange - scene exists but belongs to different project
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockResolvedValue(null) // Simulates security check failure
        },
        characters: {
          findMany: vi.fn()
        }
      } as any;

      // Act & Assert
      await expect(
        ContextBuilder.buildSceneContext('scene-1', mockDb as any, 'wrong-project-id')
      ).rejects.toThrow(HTTPException);
    });

    it('should handle empty characters list', async () => {
      // Arrange
      const mockScene = createMockScene({
        id: 'scene-1',
        title: 'Test Scene',
        projectId: 'project-1'
      });

      const sceneWithoutLocation = {
        ...mockScene,
        location: null
      };

      // Setup mocks - no characters in project
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockResolvedValue(sceneWithoutLocation)
        },
        characters: {
          findMany: vi.fn().mockResolvedValue([])
        }
      } as any;

      // Act
      const result = await ContextBuilder.buildSceneContext(
        'scene-1',
        mockDb as any,
        'project-1'
      );

      // Assert
      expect(result).toEqual({
        scene: sceneWithoutLocation,
        characters: [],
        location: null
      });
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockDb.query = {
        scenes: {
          findFirst: vi.fn().mockRejectedValue(dbError)
        },
        characters: {
          findMany: vi.fn()
        }
      } as any;

      // Act & Assert
      await expect(
        ContextBuilder.buildSceneContext('scene-1', mockDb as any, 'project-1')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('buildProjectContext', () => {
    it('should throw "Not implemented yet" error', async () => {
      // Act & Assert
      await expect(
        ContextBuilder.buildProjectContext('project-1', mockDb as any)
      ).rejects.toThrow('Not implemented yet');
    });
  });

  describe('buildCharacterContext', () => {
    it('should throw "Not implemented yet" error', async () => {
      // Act & Assert
      await expect(
        ContextBuilder.buildCharacterContext('char-1', 'project-1', mockDb as any)
      ).rejects.toThrow('Not implemented yet');
    });
  });
});
