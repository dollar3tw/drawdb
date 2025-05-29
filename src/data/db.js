import axios from 'axios';
import { templateSeeds } from "./seeds"; // Keep for potential future use

// 從環境變數或默認值獲取 API 基礎 URL
const getApiBaseUrl = () => {
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

// --- Diagram API Functions ---

export const createDiagramAPI = async (diagramData) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.post(`${API_BASE_URL}/api/diagrams`, diagramData);
    return response.data;
  } catch (error) {
    console.error("Error creating diagram via API:", error);
    throw error;
  }
};

export const getAllDiagramsAPI = async () => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.get(`${API_BASE_URL}/api/diagrams`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all diagrams via API:", error);
    throw error;
  }
};

export const getDiagramByIdAPI = async (id) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.get(`${API_BASE_URL}/api/diagrams/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching diagram by ID ${id} via API:`, error);
    throw error;
  }
};

export const updateDiagramAPI = async (id, diagramData) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.put(`${API_BASE_URL}/api/diagrams/${id}`, diagramData);
    return response.data;
  } catch (error) {
    console.error(`Error updating diagram by ID ${id} via API:`, error);
    throw error;
  }
};

export const deleteDiagramAPI = async (id) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.delete(`${API_BASE_URL}/api/diagrams/${id}`);
    return response.data; // Or handle 204 No Content response appropriately
  } catch (error) {
    console.error(`Error deleting diagram by ID ${id} via API:`, error);
    throw error;
  }
};

// --- Template API Functions ---

export const createTemplateAPI = async (templateData) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.post(`${API_BASE_URL}/api/templates`, templateData);
    return response.data;
  } catch (error) {
    console.error("Error creating template via API:", error);
    throw error;
  }
};

export const getAllTemplatesAPI = async () => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.get(`${API_BASE_URL}/api/templates`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all templates via API:", error);
    throw error;
  }
};

export const getTemplateByIdAPI = async (id) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.get(`${API_BASE_URL}/api/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching template by ID ${id} via API:`, error);
    throw error;
  }
};

export const updateTemplateAPI = async (id, templateData) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.put(`${API_BASE_URL}/api/templates/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error(`Error updating template by ID ${id} via API:`, error);
    throw error;
  }
};

export const deleteTemplateAPI = async (id) => {
  try {
    const API_BASE_URL = getApiBaseUrl();
    const response = await axios.delete(`${API_BASE_URL}/api/templates/${id}`);
    return response.data; // Or handle 204 No Content response appropriately
  } catch (error) {
    console.error(`Error deleting template by ID ${id} via API:`, error);
    throw error;
  }
};
