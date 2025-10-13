// TypeScript tipovi za Story Architect Lite aplikaciju

export interface Project {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  logline?: string;
  premise?: string;
  theme?: string;
}

export interface User {
  id: string;
  email: string;
}

export interface ProjectUpdateData {
  logline?: string;
  premise?: string;
  theme?: string;
}