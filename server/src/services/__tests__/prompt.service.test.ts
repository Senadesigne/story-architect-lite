import { describe, it, expect } from 'vitest';
import { PromptService } from '../prompt.service';
import { SceneContext, CharacterContext, ProjectContext } from '../context.builder';
import { createMockScene, createMockCharacter, createMockLocation, createMockProject } from '@test/helpers';

describe('PromptService', () => {
  describe('buildSceneSynopsisPrompt', () => {
    it('should build a complete scene synopsis prompt with all data', () => {
      // Arrange
      const mockScene = createMockScene({
        id: 'scene-1',
        title: 'Opening Scene',
        summary: 'Hero discovers their destiny',
        // Note: These properties might not exist in the current schema
        // but the prompt service expects them based on the implementation
      });

      const mockCharacters = [
        createMockCharacter({ id: 'char-1', name: 'Hero' }),
        createMockCharacter({ id: 'char-2', name: 'Mentor' })
      ];

      const mockLocation = createMockLocation({
        id: 'loc-1',
        name: 'Ancient Temple'
      });

      const context: SceneContext = {
        scene: mockScene as any, // Type assertion due to potential schema differences
        characters: mockCharacters,
        location: mockLocation
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('You are a professional screenwriting assistant');
      expect(prompt).toContain('Hero, Mentor'); // Characters list
      expect(prompt).toContain('Ancient Temple'); // Location name
      expect(prompt).toContain('Opening Scene'); // Scene title
      expect(prompt).toContain('1-2 sentence synopsis');
    });

    it('should handle scene with no characters', () => {
      // Arrange
      const mockScene = createMockScene({
        title: 'Empty Scene'
      });

      const context: SceneContext = {
        scene: mockScene as any,
        characters: [],
        location: null
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('N/A'); // Should show N/A for empty characters
      expect(prompt).toContain('N/A'); // Should show N/A for no location
      expect(prompt).toContain('Empty Scene');
    });

    it('should handle scene with no location', () => {
      // Arrange
      const mockScene = createMockScene({
        title: 'Locationless Scene'
      });

      const mockCharacters = [
        createMockCharacter({ name: 'Solo Character' })
      ];

      const context: SceneContext = {
        scene: mockScene as any,
        characters: mockCharacters,
        location: null
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('Solo Character');
      expect(prompt).toContain('Location:** N/A'); // Should show N/A for no location
      expect(prompt).toContain('Locationless Scene');
    });

    it('should handle scene with minimal data', () => {
      // Arrange
      const mockScene = createMockScene({
        title: '', // Empty title
        summary: null
      });

      const context: SceneContext = {
        scene: mockScene as any,
        characters: [],
        location: null
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('Untitled'); // Should show 'Untitled' for empty title
      expect(prompt).toContain('N/A'); // Should show N/A for empty characters and location
      expect(prompt).toContain('No content provided'); // Should handle missing content
    });

    it('should handle characters with missing names', () => {
      // Arrange
      const mockScene = createMockScene({
        title: 'Test Scene'
      });

      const mockCharacters = [
        createMockCharacter({ name: 'Named Character' }),
        createMockCharacter({ name: '' }), // Empty name
        createMockCharacter({ name: 'Another Character' })
      ];

      const context: SceneContext = {
        scene: mockScene as any,
        characters: mockCharacters,
        location: null
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('Named Character');
      expect(prompt).toContain('Unknown'); // Should show 'Unknown' for empty name
      expect(prompt).toContain('Another Character');
    });

    it('should format multiple characters correctly', () => {
      // Arrange
      const mockScene = createMockScene({
        title: 'Multi-character Scene'
      });

      const mockCharacters = [
        createMockCharacter({ name: 'Alice' }),
        createMockCharacter({ name: 'Bob' }),
        createMockCharacter({ name: 'Charlie' })
      ];

      const context: SceneContext = {
        scene: mockScene as any,
        characters: mockCharacters,
        location: null
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('Alice, Bob, Charlie'); // Should be comma-separated
    });

    it('should include all expected prompt sections', () => {
      // Arrange
      const mockScene = createMockScene({
        title: 'Complete Scene'
      });

      const mockCharacters = [createMockCharacter({ name: 'Test Character' })];
      const mockLocation = createMockLocation({ name: 'Test Location' });

      const context: SceneContext = {
        scene: mockScene as any,
        characters: mockCharacters,
        location: mockLocation
      };

      // Act
      const prompt = PromptService.buildSceneSynopsisPrompt(context);

      // Assert
      expect(prompt).toContain('**Project Context:**');
      expect(prompt).toContain('**Characters in Project:**');
      expect(prompt).toContain('**Location:**');
      expect(prompt).toContain('**Scene Data to Summarize:**');
      expect(prompt).toContain('**Scene Title/Number:**');
      expect(prompt).toContain('**Your Task:**');
    });
  });

  describe('buildCharacterDevelopmentPrompt', () => {
    it('should return placeholder prompt', () => {
      // Arrange
      const mockCharacter = createMockCharacter();
      const mockProject = createMockProject();
      const mockScenes = [createMockScene()];

      const context: CharacterContext = {
        character: mockCharacter,
        project: mockProject,
        scenes: mockScenes
      };

      // Act
      const prompt = PromptService.buildCharacterDevelopmentPrompt(context);

      // Assert
      expect(prompt).toBe('Placeholder prompt for character development');
    });
  });

  describe('buildPlotOutlinePrompt', () => {
    it('should return placeholder prompt', () => {
      // Arrange
      const mockProject = createMockProject();
      const mockCharacters = [createMockCharacter()];
      const mockLocations = [createMockLocation()];
      const mockScenes = [createMockScene()];

      const context: ProjectContext = {
        project: mockProject,
        characters: mockCharacters,
        locations: mockLocations,
        scenes: mockScenes
      };

      // Act
      const prompt = PromptService.buildPlotOutlinePrompt(context);

      // Assert
      expect(prompt).toBe('Placeholder prompt for plot outline');
    });
  });
});
