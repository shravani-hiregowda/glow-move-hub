import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

interface UserProfile {
  _id: string;
  username: string;
  role?: 'user' | 'admin';
  workoutHistory?: any[];
  dietHistory?: any[];
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (token: string, userData: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("glow_move_auth_token");
      if (token) {
        try {
          axios.defaults.headers.common['x-auth-token'] = token;
          const res = await axios.get('/api/auth/me');
          setUser(res.data);
          setIsAuthenticated(true);
        } catch (err) {
          console.error("Token validation failed");
          localStorage.removeItem("glow_move_auth_token");
          delete axios.defaults.headers.common['x-auth-token'];
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (token: string, userData: UserProfile) => {
    localStorage.setItem("glow_move_auth_token", token);
    axios.defaults.headers.common['x-auth-token'] = token;
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("glow_move_auth_token");
    delete axios.defaults.headers.common['x-auth-token'];
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) return null; // Avoid flicker during boot check

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
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
