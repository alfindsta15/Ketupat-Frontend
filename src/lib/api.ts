const TOKEN_KEY = "ketupat_token";
const ADMIN_KEY = "ketupat_admin";

// Opsional: isi VITE_API_BASE_URL (mis. https://ketupatbackend-xxx.b4a.run) di Vercel
// bila upload file besar gagal lewat proxy rewrite. Kosong = pakai /api relatif.
const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
};

/** Cache profil admin supaya refresh halaman tidak memutus sesi saat server lambat/sibuk. */
export function getCachedAdmin<T = any>(): T | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
export const setCachedAdmin = (a: unknown) => localStorage.setItem(ADMIN_KEY, JSON.stringify(a));

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** URL lengkap untuk file upload (path relatif /uploads/... atau URL absolut). */
export const fileUrl = (path?: string | null) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
};

interface ApiOptions extends RequestInit {
  json?: unknown;
  /** true = endpoint publik (tanpa token admin, tanpa redirect saat 401). */
  public?: boolean;
}

export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, public: isPublic, ...init } = options;
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };

  if (!isPublic) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let body = init.body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  const res = await fetch(`${API_BASE}/api${path}`, { ...init, headers, body });
  const data = await res.json().catch(() => ({}));

  // Hanya 401 pada endpoint admin yang berarti sesi benar-benar berakhir.
  if (res.status === 401 && !isPublic && !path.startsWith("/auth/login")) {
    clearToken();
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new ApiError(401, data.message || "Sesi berakhir, silakan login lagi");
  }
  if (!res.ok) throw new ApiError(res.status, data.message || `Request gagal (${res.status})`);
  return data as T;
}

export const rupiah = (n?: number | null) => (n == null ? "-" : "Rp" + Math.round(n).toLocaleString("id-ID"));
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";
export const fmtSize = (n?: number | null) =>
  n == null ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export const ORDER_STATUSES = [
  "WAITING_BRIEF", "WAITING_QUOTATION", "WAITING_PAYMENT", "PAYMENT_REVIEW",
  "PAID", "PROCESSING", "REVIEW", "COMPLETED", "CANCELLED",
];
export const SERVICE_LABEL: Record<string, string> = {
  TUGAS: "📚 Joki Tugas", PPT: "🎨 PPT", CV: "📄 CV", CODING: "💻 Coding",
  WEBSITE: "🌐 Website", MOBILE_APP: "📱 Mobile App", KONSULTASI: "💬 Konsultasi",
};
