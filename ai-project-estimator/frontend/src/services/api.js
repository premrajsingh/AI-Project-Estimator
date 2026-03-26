import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const analyzeProject = async (githubUrl, file = null) => {
    const formData = new FormData();
    if (githubUrl) {
        formData.append('github_url', githubUrl);
    }
    if (file) {
        formData.append('file', file);
    }

    const response = await axios.post(`${API_BASE_URL}/projects/analyze`, formData);
    return response.data;
};

export const getProjectDetails = async (projectId) => {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
    return response.data;
};

export const estimatePlanning = async (formData) => {
    // formData contains: team_size, experience, description, expected_days, file
    const response = await axios.post(`${API_BASE_URL}/planning/estimate`, formData);
    return response.data;
};

export const getPlanningDetails = async (planningId) => {
    const response = await axios.get(`${API_BASE_URL}/planning/${planningId}`);
    return response.data;
};
