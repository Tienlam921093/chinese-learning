const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Centralized API client with automatic token refresh
 * Handles:
 * - JWT token management
 * - 401 Unauthorized → refresh token → retry
 * - Error logging
 */

async function handleResponse(res) {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API Error: ${res.status}`);
  }
  return res.json();
}

async function refreshAccessToken() {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    credentials: "include", // httpOnly cookie
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    // Refresh failed - clear auth and redirect to login
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  const data = await res.json();
  localStorage.setItem("accessToken", data.token);
  return data.token;
}

export const apiClient = {
  async get(endpoint) {
    let token = localStorage.getItem("accessToken");

    let res = await fetch(`${API_BASE}/api${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    // If 401, refresh token and retry
    if (res.status === 401) {
      token = await refreshAccessToken();
      res = await fetch(`${API_BASE}/api${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
    }

    return handleResponse(res);
  },

  async post(endpoint, body) {
    let token = localStorage.getItem("accessToken");

    let res = await fetch(`${API_BASE}/api${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      token = await refreshAccessToken();
      res = await fetch(`${API_BASE}/api${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
    }

    return handleResponse(res);
  },

  async patch(endpoint, body) {
    // Similar to POST
    let token = localStorage.getItem("accessToken");
    let res = await fetch(`${API_BASE}/api${endpoint}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.status === 401) {
      token = await refreshAccessToken();
      res = await fetch(`${API_BASE}/api${endpoint}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
    }

    return handleResponse(res);
  },
};
