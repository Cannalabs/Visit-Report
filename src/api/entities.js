import { apiCall } from './config';

// ShopVisit entity
export const ShopVisit = {
  create: async (data) => {
    return apiCall('/shop-visits', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: async (id, data) => {
    return apiCall(`/shop-visits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  list: async (sortOrFilters = '', limit = 100) => {
    // Handle different call patterns: list(sort, limit) or list(filters)
    let params = new URLSearchParams();
    
    if (typeof sortOrFilters === 'string' && sortOrFilters) {
      // Sort parameter like "-created_date" - ignore for now, backend will return default order
      params.append('skip', '0');
      params.append('limit', limit.toString());
    } else if (typeof sortOrFilters === 'object' && sortOrFilters !== null) {
      // Filters object
      Object.entries(sortOrFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      if (!params.has('limit')) {
        params.append('limit', limit.toString());
      }
    } else {
      // No parameters
      params.append('skip', '0');
      params.append('limit', limit.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/shop-visits?${queryString}`;
    return apiCall(endpoint);
  },
  get: async (id) => {
    return apiCall(`/shop-visits/${id}`);
  },
  delete: async (id) => {
    return apiCall(`/shop-visits/${id}`, {
      method: 'DELETE'
    });
  },
  filter: async (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    const queryString = params.toString();
    return apiCall(`/shop-visits?${queryString}`);
  }
};

// Customer entity
export const Customer = {
  create: async (data) => {
    return apiCall('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: async (id, data) => {
    return apiCall(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  list: async (sortOrFilters = '') => {
    const params = new URLSearchParams();
    if (typeof sortOrFilters === 'string' && sortOrFilters) {
      // Sort parameter like "-created_date" - ignore for now
      params.append('skip', '0');
      params.append('limit', '100');
    } else if (typeof sortOrFilters === 'object' && sortOrFilters !== null) {
      Object.entries(sortOrFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      if (!params.has('limit')) {
        params.append('limit', '100');
      }
    } else {
      params.append('skip', '0');
      params.append('limit', '100');
    }
    const queryString = params.toString();
    const endpoint = `/customers?${queryString}`;
    return apiCall(endpoint);
  },
  get: async (id) => {
    return apiCall(`/customers/${id}`);
  },
  delete: async (id) => {
    return apiCall(`/customers/${id}`, {
      method: 'DELETE'
    });
  },
  filter: async (filters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    const queryString = params.toString();
    return apiCall(`/customers?${queryString}`);
  }
};

// Configuration entity
export const Configuration = {
  create: async (data) => {
    return apiCall('/configurations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: async (id, data) => {
    return apiCall(`/configurations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (typeof filters === 'object' && filters !== null) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    if (!params.has('limit')) {
      params.append('limit', '100');
    }
    const queryString = params.toString();
    const endpoint = `/configurations?${queryString}`;
    return apiCall(endpoint);
  },
  get: async (id) => {
    return apiCall(`/configurations/${id}`);
  },
  delete: async (id) => {
    return apiCall(`/configurations/${id}`, {
      method: 'DELETE'
    });
  }
};

// AuditLog entity
export const AuditLog = {
  create: async (data) => {
    return apiCall('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/audit-logs?${queryString}` : '/audit-logs';
    return apiCall(endpoint);
  },
  get: async (id) => {
    return apiCall(`/audit-logs/${id}`);
  }
};

// UserProfile entity
export const UserProfile = {
  create: async (data) => {
    return apiCall('/user-profiles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  update: async (id, data) => {
    return apiCall(`/user-profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/user-profiles?${queryString}` : '/user-profiles';
    return apiCall(endpoint);
  },
  get: async (id) => {
    return apiCall(`/user-profiles/${id}`);
  }
};

// User auth
export const User = {
  create: async (data) => {
    return apiCall('/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getCurrent: async () => {
    return User.me();
  },
  me: async () => {
    try {
      const user = await apiCall('/auth/me');
      // Map backend response to frontend expected format
      return {
        id: user.id,
        email: user.email,
        name: user.full_name || user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: user.avatar_url || null
      };
    } catch (error) {
      // If not authenticated, return null or throw
      throw error;
    }
  },
  signIn: async (credentials) => {
    try {
      // Login and get token
      const response = await apiCall('/auth/login-json', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password
        })
      });
      
      // Store token immediately
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
      } else {
        throw new Error('No access token received');
      }
      
      // Small delay to ensure token is stored
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get user info with the new token
      const user = await User.me();
      
      // Store user info for quick access
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      // Start token refresh after successful login
      const { startTokenRefresh } = await import('@/utils/tokenRefresh');
      startTokenRefresh();
      
      return user;
    } catch (error) {
      // Clear token on login failure
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      throw error;
    }
  },
  logout: async () => {
    // Stop token refresh
    const { stopTokenRefresh } = await import('@/utils/tokenRefresh');
    stopTokenRefresh();
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    localStorage.removeItem('is_hardcoded_admin'); // Clear hardcoded admin flag
    return true;
  },
  signOut: async () => {
    return User.logout();
  },
  signUp: async (data) => {
    try {
      // Create user
      const user = await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          full_name: data.name || data.full_name,
          role: data.role || 'sales_rep'
        })
      });
      
      // Auto-login after signup
      if (data.password) {
        return User.signIn({ email: data.email, password: data.password });
      }
      
      return {
        id: user.id,
        email: user.email,
        name: user.full_name || user.email,
        full_name: user.full_name,
        role: user.role,
        avatar_url: null
      };
    } catch (error) {
      throw error;
    }
  },
  updateMyUserData: async (data) => {
    // Get current user first
    const currentUser = await User.me();
    return apiCall(`/users/${currentUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  update: async (userId, data) => {
    return apiCall(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  list: async (filters = {}) => {
    const params = new URLSearchParams();
    if (typeof filters === 'object' && filters !== null) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    if (!params.has('limit')) {
      params.append('limit', '100');
    }
    const queryString = params.toString();
    const endpoint = `/users?${queryString}`;
    return apiCall(endpoint);
  }
};
