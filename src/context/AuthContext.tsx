import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "../lib/api";

interface Admin { id: number; name: string; email: string; role: string }
interface Ctx {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthCtx = createContext<Ctx>(null as unknown as Ctx);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api<Admin>("/auth/me").then(setAdmin).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; admin: Admin }>("/auth/login", { method: "POST", json: { email, password } });
    setToken(res.token);
    setAdmin(res.admin);
  };
  const logout = () => { clearToken(); setAdmin(null); };

  return <AuthCtx.Provider value={{ admin, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
