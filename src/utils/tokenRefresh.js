// Token refresh utility
import { API_BASE_URL } from '@/api/config';

let refreshTimer = null;
let checkTimer = null;
const CHECK_INTERVAL = 60 * 1000; // Check every minute if token needs refresh
const REFRESH_BUFFER_MINUTES = 5; // Refresh 5 minutes before expiration

/**
 * Decode JWT token to get expiration time
 */
export function getTokenExpiration(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch (e) {
    return null;
  }
}

/**
 * Check if token is expired or will expire soon
 */
function isTokenExpiringSoon(token, bufferMinutes = 5) {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  
  const now = Date.now();
  const bufferMs = bufferMinutes * 60 * 1000;
  return expiration - now < bufferMs;
}

/**
 * Refresh the access token
 */
export async function refreshAccessToken() {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return false;
    }

    // Check if token is already expired
    const expiration = getTokenExpiration(token);
    if (expiration && Date.now() >= expiration) {
      console.warn('Token already expired');
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token is invalid, clear it
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        return false;
      }
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
      console.log('Token refreshed successfully at', new Date().toLocaleTimeString());
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error refreshing token:', error);
    // Don't clear token on network errors - might be temporary
    if (error.message && error.message.includes('401')) {
      // Only clear on actual auth errors
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    return false;
  }
}

/**
 * Start automatic token refresh
 */
export function startTokenRefresh() {
  // Clear any existing timers
  if (checkTimer) {
    clearInterval(checkTimer);
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
  }

  const token = localStorage.getItem('access_token');
  if (!token) {
    return;
  }

  // Check if token needs immediate refresh
  if (isTokenExpiringSoon(token, REFRESH_BUFFER_MINUTES)) {
    refreshAccessToken();
  }

  // Set up frequent checks (every minute) to see if token needs refresh
  checkTimer = setInterval(async () => {
    const currentToken = localStorage.getItem('access_token');
    if (!currentToken) {
      stopTokenRefresh();
      return;
    }

    // Check if token is expiring soon
    if (isTokenExpiringSoon(currentToken, REFRESH_BUFFER_MINUTES)) {
      console.log('Token expiring soon, attempting refresh...');
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        // If refresh failed, check if token is already expired
        const expiration = getTokenExpiration(currentToken);
        if (expiration && Date.now() >= expiration) {
          // Token is expired, stop refresh but don't clear - let ProtectedRoute handle it
          console.warn('Token expired and refresh failed');
          stopTokenRefresh();
        } else {
          // Token not expired yet, might be temporary issue
          console.warn('Token refresh failed but token not expired, will retry');
        }
      } else {
        // Successfully refreshed
        console.log('Token refreshed successfully, will check again in 1 minute');
      }
    }
  }, CHECK_INTERVAL);
}

/**
 * Stop automatic token refresh
 */
export function stopTokenRefresh() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * Initialize token refresh on app start
 */
export function initTokenRefresh() {
  const token = localStorage.getItem('access_token');
  if (token) {
    startTokenRefresh();
  }
}

