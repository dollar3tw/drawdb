import axios from 'axios';
import { templateSeeds } from "./seeds"; // Keep for potential future use

const API_BASE_URL = 'http://localhost:3001/api'; // Adjust if your backend runs elsewhere

// --- Diagram API Functions ---

export const createDiagramAPI = async (diagramData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/diagrams`, diagramData);
    return response.data;
  } catch (error) {
    console.error("Error creating diagram via API:", error);
    throw error;
  }
};

export const getAllDiagramsAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/diagrams`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all diagrams via API:", error);
    throw error;
  }
};

export const getDiagramByIdAPI = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/diagrams/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching diagram by ID ${id} via API:`, error);
    throw error;
  }
};

export const updateDiagramAPI = async (id, diagramData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/diagrams/${id}`, diagramData);
    return response.data;
  } catch (error) {
    console.error(`Error updating diagram by ID ${id} via API:`, error);
    throw error;
  }
};

export const deleteDiagramAPI = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/diagrams/${id}`);
    return response.data; // Or handle 204 No Content response appropriately
  } catch (error) {
    console.error(`Error deleting diagram by ID ${id} via API:`, error);
    throw error;
  }
};

// --- Template API Functions ---

export const createTemplateAPI = async (templateData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/templates`, templateData);
    return response.data;
  } catch (error) {
    console.error("Error creating template via API:", error);
    throw error;
  }
};

export const getAllTemplatesAPI = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/templates`);
    return response.data;
  } catch (error) {
    console.error("Error fetching all templates via API:", error);
    throw error;
  }
};

export const getTemplateByIdAPI = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/templates/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching template by ID ${id} via API:`, error);
    throw error;
  }
};

export const updateTemplateAPI = async (id, templateData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/templates/${id}`, templateData);
    return response.data;
  } catch (error) {
    console.error(`Error updating template by ID ${id} via API:`, error);
    throw error;
  }
};

export const deleteTemplateAPI = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/templates/${id}`);
    return response.data; // Or handle 204 No Content response appropriately
  } catch (error) {
    console.error(`Error deleting template by ID ${id} via API:`, error);
    throw error;
  }
};
