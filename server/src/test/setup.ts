import { vi } from 'vitest';
import { createMockDatabase, createMockFirebaseAuth } from '@test/helpers';

// Mock database module
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => Promise.resolve(createMockDatabase())),
  testDatabaseConnection: vi.fn(() => Promise.resolve(true)),
  clearConnectionCache: vi.fn(),
}));

// Mock Firebase auth module
vi.mock('@/lib/firebase-auth', () => ({
  verifyFirebaseToken: vi.fn(() => Promise.resolve(createMockFirebaseAuth())),
}));

// Mock environment variables for consistent testing
vi.mock('@/lib/env', () => ({
  isDevelopment: vi.fn(() => true),
  getEnv: vi.fn((key: string) => {
    const mockEnvs: Record<string, string> = {
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
      'FIREBASE_PROJECT_ID': 'test-project',
      'FIREBASE_AUTH_EMULATOR_HOST': 'localhost:9099',
    };
    return mockEnvs[key];
  }),
  getFirebaseProjectId: vi.fn(() => 'test-project'),
  getDatabaseUrl: vi.fn(() => 'postgresql://test:test@localhost:5432/test'),
  getRequiredEnv: vi.fn((key: string) => {
    const mockEnvs: Record<string, string> = {
      'DATABASE_URL': 'postgresql://test:test@localhost:5432/test',
      'FIREBASE_PROJECT_ID': 'test-project',
      'FIREBASE_AUTH_EMULATOR_HOST': 'localhost:9099',
    };
    return mockEnvs[key] || '';
  }),
}));

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Additional cleanup if needed
  vi.restoreAllMocks();
});
