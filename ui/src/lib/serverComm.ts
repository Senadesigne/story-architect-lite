const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';
import { getAuthToken } from './auth-utils';

class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
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

export async function createProject(name: string) {
  const response = await fetchWithAuth('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });
  return response.json();
}

export async function getProject(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}`);
  return response.json();
}

export async function updateProject(projectId: string, data: Record<string, string | undefined>) {
  const response = await fetchWithAuth(`/api/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteProject(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}`, {
    method: 'DELETE',
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

// Chapters API
export async function getChapters(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/chapters`);
  return response.json();
}

export async function createChapter(projectId: string, data: { title: string; phase: string; order?: number }) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateChapter(chapterId: string, data: { title?: string; phase?: string; order?: number }) {
  const response = await fetchWithAuth(`/api/chapters/${chapterId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteChapter(chapterId: string) {
  const response = await fetchWithAuth(`/api/chapters/${chapterId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// Scenes API
export async function getScenes(projectId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/scenes`);
  return response.json();
}

export async function createScene(projectId: string, sceneData: { title: string; summary?: string; order?: number; locationId?: string; chapterId?: string }) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/scenes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sceneData),
  });
  return response.json();
}

export async function updateScene(sceneId: string, sceneData: { title?: string; summary?: string; order?: number; locationId?: string; chapterId?: string }) {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sceneData),
  });
  return response.json();
}

export async function deleteScene(sceneId: string) {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}`, {
    method: 'DELETE',
  });
  return response.json();
}

// AI API
export async function generateSceneSynopsis(projectId: string, sceneId: string) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/ai/generate-scene-synopsis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sceneId }),
  });
  return response.json();
}
export async function chat(
  projectId: string,
  data: {
    userInput: string;
    sessionId?: string;
    plannerContext?: string;
    mode?: 'planner' | 'brainstorming' | 'writer' | 'contextual-edit';
    workerModel?: string;
    editorContent?: string;
    selection?: string;
    messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
) {
  const response = await fetchWithAuth(`/api/projects/${projectId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

// User API
export async function updateUser(data: { displayName?: string; avatarUrl?: string }) {
  const response = await fetchWithAuth('/api/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteUser() {
  const response = await fetchWithAuth('/api/user', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

// Sessions API
export async function getSessions(projectId: string) {
  const response = await fetchWithAuth(`/api/sessions?projectId=${projectId}`);
  return response.json();
}

export async function createSession(projectId: string, name: string, mode: 'planner' | 'studio') {
  const response = await fetchWithAuth('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, name, mode }),
  });
  return response.json();
}

export async function getSession(sessionId: string) {
  const response = await fetchWithAuth(`/api/sessions/${sessionId}`);
  return response.json();
}

export async function deleteSession(sessionId: string) {
  const response = await fetchWithAuth(`/api/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  return response.json();
}

export const api = {
  getCurrentUser,
  updateUser,
  deleteUser,
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  getScenes,
  createScene,
  updateScene,
  deleteScene,
  generateSceneSynopsis,
  chat,
  getSessions,
  createSession,
  getSession,
  deleteSession,
};

export const clearTokenCache = () => {
  // No-op: Token caching is handled by Firebase SDK
};