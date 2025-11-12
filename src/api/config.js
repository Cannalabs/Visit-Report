// API Configuration
// Auto-detect API URL based on current hostname
// If accessing through nginx (port 8003), use relative path (goes through nginx proxy)
// If accessing from network IP, use port 8002 (Docker backend port)
// If accessing from localhost, use localhost:8000
function getApiBaseUrl() {
  // Check for explicit environment variable first
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Auto-detect based on current window location
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    const fullUrl = window.location.href;
    const origin = window.location.origin;
    
    // Always use relative path when accessing through nginx (port 8003 or port 80)
    // This ensures requests go through the nginx proxy to avoid CORS issues
    if (port === '8003' || port === '80' || fullUrl.includes(':8003') || origin.includes(':8003')) {
      return '/api';
    }
    
    // If accessing from localhost or 127.0.0.1, use localhost for API
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    
    // For all other cases (network IPs like 192.168.x.x), use relative path
    // This ensures requests go through nginx proxy and avoids CORS issues
    // Network IPs accessed through browser will go through nginx on port 8003
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return '/api';
    }
    
    // Fallback: use relative path for safety
    return '/api';
  }
  
  // Fallback to localhost (for SSR or non-browser environments)
  return 'http://localhost:8000/api';
}

// Make API_BASE_URL a function to ensure it's evaluated at runtime, not build time
// This prevents issues with cached JavaScript
function getApiBaseUrlDynamic() {
  return getApiBaseUrl();
}

// For backward compatibility, export as a getter
const API_BASE_URL = getApiBaseUrl();


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
  // Get API URL dynamically to handle runtime changes
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}${endpoint}`;
  const token = localStorage.getItem('access_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkError) {
    throw new Error(`Network error: ${networkError.message}. Please check if the backend is running.`);
  }
  
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
  
  // Handle empty responses and parse JSON
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return null;
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Invalid JSON response: ${parseError.message}`);
    }
  } catch (error) {
    // If it's already an Error object, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, wrap it
    throw new Error(`Failed to read response: ${error.message || error}`);
  }
}

export { API_BASE_URL, getApiBaseUrl, apiCall };

