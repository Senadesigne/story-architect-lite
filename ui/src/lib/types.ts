// TypeScript tipovi za Story Architect Lite aplikaciju

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  // Faza 0: Ideja Priče
  story_idea?: string;
  // Faza 1: Ideja i Koncept
  logline?: string;
  premise?: string;
  theme?: string;
  genre?: string;
  audience?: string;
  // Faza 2: Planiranje i Istraživanje
  brainstorming?: string;
  research?: string;
  // Faza 3: Izgradnja Svijeta
  rules_definition?: string;
  culture_and_history?: string;
  // Faza 5: Strukturiranje Radnje
  synopsis?: string;
  outline_notes?: string;
  beat_sheet_setup?: string;
  beat_sheet_inciting_incident?: string;
  beat_sheet_midpoint?: string;
  beat_sheet_climax?: string;
  beat_sheet_falling_action?: string;
  // Faza 6: Završne Pripreme
  point_of_view?: string;
}

export interface User {
  id: string;
  email: string;
}

export interface ProjectUpdateData {
  // Faza 0: Ideja Priče
  story_idea?: string;
  // Faza 1: Ideja i Koncept
  logline?: string;
  premise?: string;
  theme?: string;
  genre?: string;
  audience?: string;
  // Faza 2: Planiranje i Istraživanje
  brainstorming?: string;
  research?: string;
  // Faza 3: Izgradnja Svijeta
  rules_definition?: string;
  culture_and_history?: string;
  // Faza 5: Strukturiranje Radnje
  synopsis?: string;
  outline_notes?: string;
  beat_sheet_setup?: string;
  beat_sheet_inciting_incident?: string;
  beat_sheet_midpoint?: string;
  beat_sheet_climax?: string;
  beat_sheet_falling_action?: string;
  // Faza 6: Završne Pripreme
  point_of_view?: string;
}

export interface Scene {
  id: string;
  title: string;
  summary?: string;
  order: number;
  projectId: string;
  locationId?: string;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  projectId: string;
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  motivation?: string;
  goal?: string;
  fear?: string;
  backstory?: string;
  arcStart?: string;
  arcEnd?: string;
  projectId: string;
}