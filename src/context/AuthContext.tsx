import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError, clearToken, getCachedAdmin, getToken, setCachedAdmin, setToken } from "../lib/api";

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
  // Pulihkan sesi langsung dari cache (tanpa menunggu server) -> refresh tidak lagi memutus login.
  const [admin, setAdmin] = useState<Admin | null>(() => (getToken() ? getCachedAdmin<Admin>() : null));
  const [loading, setLoading] = useState(() => !!getToken() && !getCachedAdmin());

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    // Validasi token di belakang layar. Sesi HANYA dihapus bila server menjawab 401.
    // Error jaringan / 429 / 5xx (mis. server baru bangun) tidak menghapus token.
    const validate = async (attempt = 0): Promise<void> => {
      try {
        const me = await api<Admin>("/auth/me");
        if (cancelled) return;
        setAdmin(me);
        setCachedAdmin(me);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          setAdmin(null);
          setLoading(false);
          return;
        }
        if (attempt < 3) {
          setTimeout(() => validate(attempt + 1), 1500 * (attempt + 1));
        } else {
          setLoading(false); // tetap pakai cache; request berikutnya akan mencoba lagi
        }
      }
    };
    validate();
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api<{ token: string; admin: Admin }>("/auth/login", { method: "POST", json: { email, password } });
    setToken(res.token);
    setCachedAdmin(res.admin);
    setAdmin(res.admin);
  };
  const logout = () => { clearToken(); setAdmin(null); };

  return <AuthCtx.Provider value={{ admin, loading, login, logout }}>{children}</AuthCtx.Provider>;
}
