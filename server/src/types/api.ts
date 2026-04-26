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

// API Response Types
export interface ApiError {
  error: string;
}

export interface ApiSuccess {
  message: string;
}

// Utility type for database update data
export type DatabaseUpdateData = Record<string, string | number | Date | null>;
