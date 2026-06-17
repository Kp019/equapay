import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const TOKEN_KEY = "splitwise_auth_token";

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, displayName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiRequest: <T>(path: string, options?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Restore token on boot ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (savedToken) {
          // Verify token is still valid
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const { user: u } = await res.json();
            setToken(savedToken);
            setUser(u);
          } else {
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Generic authenticated request ─────────────────────────────────────────
  const apiRequest = useCallback(
    function request<T>(path: string, options: RequestInit = {}): Promise<T> {
      const currentToken = token;
      const extraHeaders = (options.headers ?? {}) as Record<string, string>;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...extraHeaders,
      };
      return fetch(`${API_BASE}${path}`, { ...options, headers }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any).error ?? `HTTP ${res.status}`);
        }
        return res.json() as Promise<T>;
      });
    },
    [token]
  );

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? "Login failed");
    await AsyncStorage.setItem(TOKEN_KEY, body.token);
    setToken(body.token);
    setUser(body.user);
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(
    async (username: string, displayName: string, password: string) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, password }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Registration failed");
      await AsyncStorage.setItem(TOKEN_KEY, body.token);
      setToken(body.token);
      setUser(body.user);
    },
    []
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, apiRequest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
