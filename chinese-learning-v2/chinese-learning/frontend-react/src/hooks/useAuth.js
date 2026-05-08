import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Custom hook to access auth state and methods
 * Usage: const { user, login, logout, isAuthenticated } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
