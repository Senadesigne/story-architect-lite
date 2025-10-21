// API Request Body Types

export interface UpdateUserBody {
  displayName?: string;
  avatarUrl?: string;
}

export interface UpdateProjectBody {
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

export interface CreateLocationBody {
  name: string;
  description?: string;
}

export interface UpdateLocationBody {
  name?: string;
  description?: string;
}

export interface CreateCharacterBody {
  name: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
}

export interface UpdateCharacterBody {
  name?: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
}

export interface CreateSceneBody {
  title: string;
  summary?: string;
  order?: number;
  locationId?: string;
}

export interface UpdateSceneBody {
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
