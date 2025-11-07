// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Helper to check if token is expired
function isTokenExpired(token) {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiration = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expiration;
  } catch (e) {
    return false; // If we can't parse, assume not expired
  }
}

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    // Handle 401 Unauthorized - but don't clear token here unless it's definitely expired
    // Let the calling components (like ProtectedRoute) decide when to clear
    // This prevents race conditions and allows for better error handling
    if (response.status === 401) {
      // Don't clear token if this is a login attempt
      if (!endpoint.includes('login')) {
        // Only clear token if it's actually expired
        // Otherwise, let components handle it (they might want to try refresh)
        if (token && isTokenExpired(token)) {
          // Token is expired, safe to clear
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        }
        // Just throw the error - let the component handle token clearing
        // This way ProtectedRoute can use cached data before clearing
      }
      throw new Error('Not authenticated');
    }
    
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    // For 422 errors, show validation details
    if (response.status === 422 && error.detail) {
      if (Array.isArray(error.detail)) {
        // Pydantic validation errors
        const errors = error.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ');
        throw new Error(`Validation error: ${errors}`);
      } else if (typeof error.detail === 'string') {
        throw new Error(error.detail);
      }
    }
    throw new Error(error.detail || error.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

export { API_BASE_URL, apiCall };

