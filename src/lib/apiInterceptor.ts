import axios from 'axios';

// Create axios instance
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Function to handle 401 redirects
const handleUnauthorized = () => {
  localStorage.removeItem('adminToken');
  window.location.href = '/login';
};

// Axios interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Fetch interceptor
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  if (response.status === 401) {
    handleUnauthorized();
  }
  
  return response;
};

export { apiClient };