import { vi } from 'vitest';
import type { users, projects, characters, locations, scenes } from '@/schema/schema';

// Type definitions for mock data
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Scene = typeof scenes.$inferSelect;

// Mock Firebase Auth user type
export type MockFirebaseUser = {
  id: string;
  email: string | undefined;
};

// Test mocks interface
export interface TestMocks {
  database?: ReturnType<typeof createMockDatabase>;
  firebaseAuth?: ReturnType<typeof createMockFirebaseAuth>;
}

/**
 * Creates a mock database with chainable Drizzle ORM methods
 */
export const createMockDatabase = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  innerJoin: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  having: vi.fn().mockReturnThis(),
  // Additional Drizzle methods that might be used
  execute: vi.fn(),
  prepare: vi.fn().mockReturnThis(),
  all: vi.fn(),
  get: vi.fn(),
});

/**
 * Creates a mock Firebase Auth user
 */
export const createMockFirebaseAuth = (): MockFirebaseUser => ({
  id: 'test-user-id',
  email: 'test@example.com',
});

/**
 * Creates mock user data
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  avatarUrl: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

/**
 * Creates mock project data
 */
export const createMockProject = (overrides?: Partial<Project>): Project => ({
  id: 'test-project-id',
  title: 'Test Project',
  userId: 'test-user-id',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  // Phase 1: Idea and Concept
  logline: null,
  premise: null,
  theme: null,
  genre: null,
  audience: null,
  // Phase 2: Planning and Research
  brainstorming: null,
  research: null,
  // Phase 3: World Building
  rules_definition: null,
  culture_and_history: null,
  // Phase 5: Plot Structure
  synopsis: null,
  outline_notes: null,
  // Phase 6: Final Preparations
  point_of_view: null,
  ...overrides,
});

/**
 * Creates mock character data
 */
export const createMockCharacter = (overrides?: Partial<Character>): Character => ({
  id: 'test-character-id',
  name: 'Test Character',
  role: 'protagonist',
  motivation: 'To save the world',
  goal: 'Defeat the villain',
  fear: 'Losing loved ones',
  backstory: 'Born in a small village',
  arcStart: 'Naive and inexperienced',
  arcEnd: 'Wise and confident',
  projectId: 'test-project-id',
  ...overrides,
});

/**
 * Creates mock location data
 */
export const createMockLocation = (overrides?: Partial<Location>): Location => ({
  id: 'test-location-id',
  name: 'Test Location',
  description: 'A mysterious place',
  projectId: 'test-project-id',
  ...overrides,
});

/**
 * Creates mock scene data
 */
export const createMockScene = (overrides?: Partial<Scene>): Scene => ({
  id: 'test-scene-id',
  title: 'Test Scene',
  summary: 'An important scene in the story',
  order: 1,
  projectId: 'test-project-id',
  locationId: 'test-location-id',
  ...overrides,
});

/**
 * Creates a test Hono application with mocks
 * TODO: Implement when needed for integration tests
 */
export const createTestApp = (mocks?: TestMocks) => {
  // Placeholder for future implementation
  // This will be implemented when we create integration tests
  console.log('createTestApp called with mocks:', mocks);
  return null;
};

/**
 * Helper to create multiple mock users
 */
export const createMockUsers = (count: number, baseOverrides?: Partial<User>): User[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockUser({
      id: `test-user-${index + 1}`,
      email: `test${index + 1}@example.com`,
      displayName: `Test User ${index + 1}`,
      ...baseOverrides,
    })
  );
};

/**
 * Helper to create multiple mock projects
 */
export const createMockProjects = (count: number, userId: string, baseOverrides?: Partial<Project>): Project[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockProject({
      id: `test-project-${index + 1}`,
      title: `Test Project ${index + 1}`,
      userId,
      ...baseOverrides,
    })
  );
};

/**
 * Helper to reset all mocks to their default state
 */
export const resetAllMocks = () => {
  vi.clearAllMocks();
};

/**
 * Helper to create a mock database response for successful operations
 */
export const createMockDatabaseResponse = <T>(data: T | T[]) => {
  const mockDb = createMockDatabase();
  mockDb.returning.mockResolvedValue(Array.isArray(data) ? data : [data]);
  mockDb.execute.mockResolvedValue(Array.isArray(data) ? data : [data]);
  return mockDb;
};

/**
 * Helper to create a mock database that throws an error
 */
export const createMockDatabaseError = (error: Error) => {
  const mockDb = createMockDatabase();
  mockDb.returning.mockRejectedValue(error);
  mockDb.execute.mockRejectedValue(error);
  return mockDb;
};
