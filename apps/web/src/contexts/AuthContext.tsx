import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { UserDto } from "@jerai/shared";
import { api } from "@/lib/api-client";

export interface AuthContextType {
  isAuthenticated: boolean;
  user: UserDto | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserDto>;
  register: (email: string, password: string) => Promise<UserDto>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<UserDto> => {
    const res = await api.login({ email, password });
    setUser(res.user);
    return res.user;
  };

  const register = async (email: string, password: string): Promise<UserDto> => {
    const res = await api.register({ email, password });
    setUser(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    isAuthenticated: Boolean(user),
    user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
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
