const TOKEN_KEY = "ketupat_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api<T = any>(path: string, options: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body = options.body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const res = await fetch(`/api${path}`, { ...options, headers, body });
  if (res.status === 401 && !path.startsWith("/auth/login")) {
    clearToken();
    window.location.href = "/login";
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request gagal (${res.status})`);
  return data as T;
}

export const rupiah = (n?: number | null) => (n == null ? "-" : "Rp" + Math.round(n).toLocaleString("id-ID"));
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-";

export const ORDER_STATUSES = [
  "WAITING_BRIEF", "WAITING_QUOTATION", "WAITING_PAYMENT", "PAYMENT_REVIEW",
  "PAID", "PROCESSING", "REVIEW", "COMPLETED", "CANCELLED",
];
export const SERVICE_LABEL: Record<string, string> = {
  TUGAS: "📚 Joki Tugas", PPT: "🎨 PPT", CV: "📄 CV", CODING: "💻 Coding",
  WEBSITE: "🌐 Website", MOBILE_APP: "📱 Mobile App", KONSULTASI: "💬 Konsultasi",
};
