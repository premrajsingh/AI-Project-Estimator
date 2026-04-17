import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({ baseURL: API_BASE_URL });

// Attach auth token to every request automatically
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Code / Repo Analysis ──────────────────────────────────────────────────────

export const analyzeProject = async (githubUrl, file = null, hourlyRate = 1000, numDevelopers = 1, experience = "Intermediate") => {
  const formData = new FormData();
  if (githubUrl) formData.append('github_url', githubUrl);
  if (file) formData.append('file', file);
  formData.append('hourly_rate', hourlyRate);
  formData.append('num_developers', numDevelopers);
  formData.append('experience', experience);
  const response = await apiClient.post('/projects/analyze', formData);
  return response.data;
};

export const getProjectDetails = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}`);
  return response.data;
};

export const getAllProjects = async () => {
  const response = await apiClient.get('/projects');
  return response.data;
};

export const deleteProject = async (projectId) => {
  const response = await apiClient.delete(`/projects/${projectId}`);
  return response.data;
};

export const deleteAllProjects = async () => {
  const response = await apiClient.delete('/projects');
  return response.data;
};

// ── Idea Estimator / Planning ─────────────────────────────────────────────────

export const estimatePlanning = async (formData) => {
  const response = await apiClient.post('/planning/estimate', formData);
  return response.data;
};

export const getPlanningDetails = async (planningId) => {
  const response = await apiClient.get(`/planning/${planningId}`);
  return response.data;
};

export const getAllPlannings = async () => {
  const response = await apiClient.get('/planning');
  return response.data;
};

export const deletePlanning = async (planningId) => {
  const response = await apiClient.delete(`/planning/${planningId}`);
  return response.data;
};

export const deleteAllPlannings = async () => {
  const response = await apiClient.delete('/planning');
  return response.data;
};

// ── GitHub Integration ────────────────────────────────────────────────────────

export const getGithubRepos = async () => {
  const response = await apiClient.get('/github/repos');
  return response.data;
};

export const connectGithubUrl = () => {
  const token = localStorage.getItem('token');
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
  return `${baseUrl}/api/v1/auth/github?token=${token}`;
};

export const disconnectGithubRepos = async () => {
  const response = await apiClient.delete('/github/disconnect');
  return response.data;
};

export const connectGithubManual = async (username, token) => {
  const response = await apiClient.post('/auth/github/manual', { username, token });
  return response.data;
};
