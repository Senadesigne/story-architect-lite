import { getAuth } from 'firebase/auth';
import { app } from './firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

async function getAuthToken(): Promise<string | null> {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken();
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new APIError(
      response.status,
      `API request failed: ${response.statusText}`
    );
  }

  return response;
}

// API endpoints
export async function getCurrentUser() {
  const response = await fetchWithAuth('/api/user');
  return response.json();
}

export async function getProjects() {
  const response = await fetchWithAuth('/api/projects');
  return response.json();
}

export async function createProject() {
  const response = await fetchWithAuth('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export async function getProject(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}`);
  return response.json();
}

export async function updateProject(projectId: string, data: any) {
  const response = await fetchWithAuth(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Locations API
export async function getLocations(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/locations`);
  return response.json();
}

export async function createLocation(projectId: string, data: { name: string; description?: string }) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateLocation(locationId: string, data: { name?: string; description?: string }) {
  const response = await fetchWithAuth(`/api/locations/${locationId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteLocation(locationId: string) {
  const response = await fetchWithAuth(`/api/locations/${locationId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// Characters API
export async function getCharacters(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/characters`);
  return response.json();
}

export async function createCharacter(projectId: string, data: { 
  name: string; 
  role?: string; 
  motivation?: string; 
  goal?: string; 
  fear?: string; 
  backstory?: string; 
  arcStart?: string; 
  arcEnd?: string; 
}) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/characters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateCharacter(characterId: string, data: { 
  name?: string; 
  role?: string; 
  motivation?: string; 
  goal?: string; 
  fear?: string; 
  backstory?: string; 
  arcStart?: string; 
  arcEnd?: string; 
}) {
  const response = await fetchWithAuth(`/api/characters/${characterId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteCharacter(characterId: string) {
  const response = await fetchWithAuth(`/api/characters/${characterId}`, {
    method: 'DELETE',
  });
  return response.json();
}

export const api = {
  getCurrentUser,
  getProjects,
  createProject,
  getProject,
  updateProject,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
}; 