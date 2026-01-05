// API Request Body Types - Now using Zod inferred types
// Import Zod inferred types from validation schemas
export type {
  UpdateUserBody,
  UpdateProjectBody,
  CreateLocationBody,
  UpdateLocationBody,
  CreateCharacterBody,
  UpdateCharacterBody,
  CreateSceneBody,
  UpdateSceneBody
} from '../schemas/validation.js';

// Legacy interfaces kept for backward compatibility (deprecated)
// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyUpdateUserBody {
  displayName?: string;
  avatarUrl?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyUpdateProjectBody {
  logline?: string;
  premise?: string;
  theme?: string;
  genre?: string;
  audience?: string;
  brainstorming?: string;
  research?: string;
  rules_definition?: string;
  culture_and_history?: string;
  synopsis?: string;
  outline_notes?: string;
  point_of_view?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyCreateLocationBody {
  name: string;
  description?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyUpdateLocationBody {
  name?: string;
  description?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyCreateCharacterBody {
  name: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyUpdateCharacterBody {
  name?: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyCreateSceneBody {
  title: string;
  summary?: string;
  order?: number;
  locationId?: string;
}

// @deprecated Use Zod inferred types from validation schemas instead
export interface LegacyUpdateSceneBody {
  title?: string;
  summary?: string;
  order?: number;
  locationId?: string;
}

// API Response Types
export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  message: string;
}

// Utility type for database update data
export type DatabaseUpdateData = Record<string, string | number | Date | null>;
