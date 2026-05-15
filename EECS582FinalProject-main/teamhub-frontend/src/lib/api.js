/**
 * API Service for communicating with Django backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to get auth token from localStorage
const getAuthToken = () => {
  const auth = localStorage.getItem('teamhub_auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      return parsed.access;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper function to get refresh token
const getRefreshToken = () => {
  const auth = localStorage.getItem('teamhub_auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      return parsed.refresh;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Helper function to save auth tokens
export const saveAuthTokens = (access, refresh, user) => {
  localStorage.setItem('teamhub_auth', JSON.stringify({ access, refresh, user }));
};

// Helper function to clear auth tokens
export const clearAuthTokens = () => {
  localStorage.removeItem('teamhub_auth');
  localStorage.removeItem('teamhub_session');
};

// Refresh access token using refresh token
export const refreshAccessToken = async () => {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearAuthTokens();
    throw new Error('Failed to refresh token');
  }

  const data = await response.json();
  const auth = JSON.parse(localStorage.getItem('teamhub_auth'));
  saveAuthTokens(data.access, data.refresh || refresh, auth.user);
  return data.access;
};

// Generic API request function with automatic token refresh
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  try {
    let response = await fetch(url, mergedOptions);

    // If unauthorized and we have a refresh token, try to refresh
    if (response.status === 401 && getRefreshToken()) {
      try {
        const newToken = await refreshAccessToken();
        // Retry the request with new token
        mergedOptions.headers.Authorization = `Bearer ${newToken}`;
        response = await fetch(url, mergedOptions);
      } catch (refreshError) {
        clearAuthTokens();
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.detail || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
};

// ============== Authentication APIs ==============

export const auth = {
  register: async (data) => {
    const response = await apiRequest('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (response.access && response.refresh) {
      saveAuthTokens(response.access, response.refresh, response.user);
    }
    return response;
  },

  login: async (email, password, rememberMe = false) => {
    const response = await apiRequest('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me: rememberMe }),
    });
    if (response.access && response.refresh) {
      saveAuthTokens(response.access, response.refresh, response.user);
    }
    return response;
  },

  logout: async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await apiRequest('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      } catch (e) {
        // Ignore errors during logout
      }
    }
    clearAuthTokens();
  },

  getCurrentUser: async () => {
    return await apiRequest('/auth/me/');
  },

  updateProfile: async (data) => {
    return await apiRequest('/auth/me/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  changePassword: async (oldPassword, newPassword) => {
    return await apiRequest('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });
  },

  requestPasswordReset: async (email) => {
    return await apiRequest('/auth/password-reset/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  confirmPasswordReset: async (uid, token, password) => {
    return await apiRequest('/auth/password-reset-confirm/', {
      method: 'POST',
      body: JSON.stringify({ uid, token, password }),
    });
  },
};

// ============== Resource APIs ==============

export const tasks = {
  getAll: async (sprintId = null) => {
    const query = sprintId ? `?sprint_id=${sprintId}` : '';
    return await apiRequest(`/tasks/${query}`);
  },

  getById: async (id) => {
    return await apiRequest(`/tasks/${id}/`);
  },

  create: async (data) => {
    return await apiRequest('/tasks/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return await apiRequest(`/tasks/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  partialUpdate: async (id, data) => {
    return await apiRequest(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await apiRequest(`/tasks/${id}/`, {
      method: 'DELETE',
    });
  },
};

export const sprints = {
  getAll: async () => {
    return await apiRequest('/sprints/');
  },

  getById: async (id) => {
    return await apiRequest(`/sprints/${id}/`);
  },

  create: async (data) => {
    return await apiRequest('/sprints/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return await apiRequest(`/sprints/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await apiRequest(`/sprints/${id}/`, {
      method: 'DELETE',
    });
  },
};

export const groups = {
  getAll: async () => {
    return await apiRequest('/groups/');
  },

  getById: async (id) => {
    return await apiRequest(`/groups/${id}/`);
  },

  create: async (data) => {
    return await apiRequest('/groups/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return await apiRequest(`/groups/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return await apiRequest(`/groups/${id}/`, {
      method: 'DELETE',
    });
  },

  join: async (joinCode) => {
    return await apiRequest('/groups/join/', {
      method: 'POST',
      body: JSON.stringify({ join_code: joinCode }),
    });
  },
};
