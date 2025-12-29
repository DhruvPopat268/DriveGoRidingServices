import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
// Removed - using cookies only

// Response interceptor for handling 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('user');
      //window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;