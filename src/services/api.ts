import logger from '../utils/logger';
import axios from 'axios';
import { ApiResponse, ClaudeResponse, SynthesisArtifact } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Base API service for making HTTP requests to the backend
 */
class ApiService {
  /**
   * Make a GET request to the API
   */
  async get<T>(endpoint: string): Promise<T> {
    try {
      logger.info('Making GET request', { endpoint });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('GET request failed', error, { endpoint });
      throw error;
    }
  }
  
  /**
   * Make a POST request to the API
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      logger.info('Making POST request', { endpoint, data });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('POST request failed', error, { endpoint, data });
      throw error;
    }
  }
  
  /**
   * Make a PUT request to the API
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      logger.info('Making PUT request', { endpoint, data });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('PUT request failed', error, { endpoint, data });
      throw error;
    }
  }
  
  /**
   * Make a DELETE request to the API
   */
  async delete<T>(endpoint: string): Promise<T> {
    try {
      logger.info('Making DELETE request', { endpoint });
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      logger.error('DELETE request failed', error, { endpoint });
      throw error;
    }
  }
}

// Canvas API endpoints
export const canvasApi = {
  // Get all canvases
  getAll: () => api.get<{ canvases: any[] }>('/canvas'),
  
  // Get a specific canvas by ID
  getById: (id: string) => api.get<{ canvas: any }>(`/canvas/${id}`),
  
  // Create a new canvas
  create: (data: { title: string, initialQuery: string }) => 
    api.post<{ canvas: any }>('/canvas', data),
  
  // Update a canvas
  update: (id: string, data: any) => 
    api.put<{ canvas: any }>(`/canvas/${id}`, data),
  
  // Delete a canvas
  delete: (id: string) => 
    api.delete<{ success: boolean }>(`/canvas/${id}`),
};

// API client configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Claude API service
export const claudeApi = {
  // Process initial query
  async processQuery(query: string): Promise<ApiResponse<ClaudeResponse>> {
    try {
      logger.info('Sending request to Claude API:', {
        endpoint: '/api/claude/query',
        queryLength: query.length,
        baseURL: axios.defaults.baseURL || 'Not set'
      });
      
      const response = await apiClient.post('/api/claude/query', { query });
      
      if (response.status !== 200) {
        throw new Error(`API returned status code ${response.status}`);
      }
      
      logger.info('Received successful response from Claude API', {
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('API Error processing query:', error);
      if (error instanceof Error && error.message === 'Network Error') {
        logger.error('Network error details:', {
          message: 'Failed to connect to the API server. Make sure the server is running at the expected URL.',
          baseURL: axios.defaults.baseURL,
          endpoint: '/api/claude/query',
        });
      }
      return {
        success: false,
        error: 'Failed to process query. Please try again.'
      };
    }
  },

  // Process follow-up query
  async processFollowUp(query: string, context: string[]): Promise<ApiResponse<ClaudeResponse>> {
    try {
      logger.info('Sending follow-up request to Claude API:', {
        endpoint: '/api/claude/follow-up',
        questionLength: query.length,
        contextLength: context.length,
        baseURL: axios.defaults.baseURL || 'Not set'
      });
      
      const response = await apiClient.post('/api/claude/follow-up', { query, context });
      
      if (response.status !== 200) {
        throw new Error(`API returned status code ${response.status}`);
      }
      
      logger.info('Received successful follow-up response from Claude API', {
        status: response.status,
        dataSize: JSON.stringify(response.data).length
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      logger.error('API Error processing follow-up:', error);
      
      if (error instanceof Error && error.message === 'Network Error') {
        logger.error('Network error details:', {
          message: 'Failed to connect to the API server. Make sure the server is running at the expected URL.',
          baseURL: axios.defaults.baseURL,
          endpoint: '/api/claude/follow-up',
        });
      }
      
      return {
        success: false,
        error: 'Failed to process follow-up query. Please try again.'
      };
    }
  },

  // Synthesize insights
  async synthesize(contexts: string[], customPrompt?: string): Promise<ApiResponse<SynthesisArtifact>> {
    try {
      const response = await apiClient.post('/api/claude/synthesize', { contexts, customPrompt });
      return response.data;
    } catch (error) {
      console.error('API Error synthesizing insights:', error);
      return {
        success: false,
        error: 'Failed to synthesize insights. Please try again.',
      };
    }
  },
};

// Node API service
export const nodeApi = {
  // Update node content
  async updateNodeContent(canvasId: string, nodeId: string, content: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.put(`/node/canvas/${canvasId}/node/${nodeId}/content`, { content });
      return response.data;
    } catch (error) {
      console.error('API Error updating node content:', error);
      return {
        success: false,
        error: 'Failed to update node content. Please try again.',
      };
    }
  },

  // Add attachment to node
  async addAttachment(canvasId: string, nodeId: string, formData: FormData): Promise<ApiResponse<any>> {
    try {
      const response = await axios.post(
        `${API_URL}/node/canvas/${canvasId}/node/${nodeId}/attachment`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('API Error adding attachment:', error);
      return {
        success: false,
        error: 'Failed to add attachment. Please try again.',
      };
    }
  },

  // Remove attachment from node
  async removeAttachment(canvasId: string, nodeId: string, attachmentIndex: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/node/canvas/${canvasId}/node/${nodeId}/attachment/${attachmentIndex}`);
      return response.data;
    } catch (error) {
      console.error('API Error removing attachment:', error);
      return {
        success: false,
        error: 'Failed to remove attachment. Please try again.',
      };
    }
  },

  // Add source to node
  async addSource(canvasId: string, nodeId: string, source: { text: string, url?: string }): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/node/canvas/${canvasId}/node/${nodeId}/source`, source);
      return response.data;
    } catch (error) {
      console.error('API Error adding source:', error);
      return {
        success: false,
        error: 'Failed to add source. Please try again.',
      };
    }
  },

  // Remove source from node
  async removeSource(canvasId: string, nodeId: string, sourceIndex: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/node/canvas/${canvasId}/node/${nodeId}/source/${sourceIndex}`);
      return response.data;
    } catch (error) {
      console.error('API Error removing source:', error);
      return {
        success: false,
        error: 'Failed to remove source. Please try again.',
      };
    }
  },
};

// Summary API service
export const summaryApi = {
  // Generate mind map summary
  async generateSummary(canvasId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.post(`/summary/canvas/${canvasId}/summary`);
      return response.data;
    } catch (error) {
      console.error('API Error generating summary:', error);
      return {
        success: false,
        error: 'Failed to generate summary. Please try again.',
      };
    }
  },

  // Get all summaries for a canvas
  async getSummaries(canvasId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get(`/summary/canvas/${canvasId}/summary`);
      return response.data;
    } catch (error) {
      console.error('API Error fetching summaries:', error);
      return {
        success: false,
        error: 'Failed to fetch summaries. Please try again.',
      };
    }
  },

  // Delete a summary
  async deleteSummary(canvasId: string, summaryIndex: number): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.delete(`/summary/canvas/${canvasId}/summary/${summaryIndex}`);
      return response.data;
    } catch (error) {
      console.error('API Error deleting summary:', error);
      return {
        success: false,
        error: 'Failed to delete summary. Please try again.',
      };
    }
  },
};

// Create singleton instance
const api = new ApiService();
export default api; 