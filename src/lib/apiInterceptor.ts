// API interceptor for handling authentication and redirects
class ApiInterceptor {
  static async fetch(url: string, options: RequestInit = {}) {
    // Always include credentials for cookie-based auth
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - redirect to login
      if (response.status === 401) {
        // Clear any local storage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/login';
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  static async get(url: string, options: RequestInit = {}) {
    return this.fetch(url, { ...options, method: 'GET' });
  }

  static async post(url: string, body?: any, options: RequestInit = {}) {
    return this.fetch(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static async put(url: string, body?: any, options: RequestInit = {}) {
    return this.fetch(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  static async delete(url: string, options: RequestInit = {}) {
    return this.fetch(url, { ...options, method: 'DELETE' });
  }
}

export default ApiInterceptor;