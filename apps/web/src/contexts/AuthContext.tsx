import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage on initial chunk load
    try {
      const savedState = localStorage.getItem("glow_move_auth_token");
      if (savedState === "authenticated") {
        setIsAuthenticated(true);
      }
    } catch {
      // ignore storage access errors
    }
    setIsLoading(false);
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem("glow_move_auth_token", "authenticated");
    } catch {
      // ignore storage access errors
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem("glow_move_auth_token");
    } catch {
      // ignore storage access errors
    }
  };

  if (isLoading) return null; // Avoid flicker during boot check

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
