import React, { createContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/apiClient";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restore session on app load (like vanilla helpers.js restoreAuthSession)
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (token) {
          const userData = await apiClient.get("/auth/me");
          setUser(userData);
        }
      } catch (err) {
        console.error("Session restore failed:", err);
        localStorage.removeItem("accessToken");
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      localStorage.setItem("accessToken", res.token);
      setUser(res.user);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
    }
  }, []);

  const value = {
    user,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
