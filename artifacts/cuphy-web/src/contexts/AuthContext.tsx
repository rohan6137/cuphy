import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getStoredUser, setStoredUser, setToken, clearToken, getToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: "student" | "admin";
  semester?: number;
  profilePicture?: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(u => {
          if (u) {
            setUser(u);
            setStoredUser(u);
          } else {
            clearToken();
            setUser(null);
          }
        })
        .catch(() => {
          setUser(stored);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  function login(user: User, token: string) {
    setToken(token);
    setStoredUser(user);
    setUser(user);
  }

  function logout() {
    const token = getToken();
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearToken();
    setUser(null);
    queryClient.clear();
  }

  function updateUser(updatedUser: User) {
    setUser(updatedUser);
    setStoredUser(updatedUser);
  }

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      isAdmin: user?.role === "admin",
      isAuthenticated: !!user,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
