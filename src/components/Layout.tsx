import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BottomSheet } from "./ui";

const NAV = [
  ["/", "Dashboard", "📊"],
  ["/orders", "Orders", "📦"],
  ["/payments", "Payments", "💳"],
  ["/customers", "Customers", "👥"],
  ["/services", "Services", "🧰"],
  ["/reviews", "Reviews", "⭐"],
  ["/settings", "Settings", "⚙️"],
] as const;

const PRIMARY = NAV.slice(0, 4); // tampil di tab bar bawah (HP)
const MORE = NAV.slice(4); // masuk menu "Lainnya"

const isActivePath = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(to + "/"));

export default function Layout() {
  const { admin, loading, logout } = useAuth();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (loading) return <div className="p-10 text-slate-500">Memuat…</div>;
  if (!admin) return <Navigate to="/login" replace />;

  const current = NAV.find(([to]) => isActivePath(pathname, to));
  const moreActive = MORE.some(([to]) => isActivePath(pathname, to));

  return (
    <div className="min-h-screen-dvh md:flex">
      {/* ---------- Sidebar (desktop) ---------- */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-navy-900 p-5 text-white md:flex">
        <div className="mb-8">
          <div className="text-2xl font-extrabold tracking-tight">KETU<span className="text-accent">PAT</span></div>
          <div className="text-[10px] font-semibold tracking-widest text-slate-400">KERJAKAN TUGAS CEPAT & TEPAT</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-electric text-white" : "text-slate-300 hover:bg-navy-700"}`
              }
            >
              <span>{icon}</span>{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-navy-700 pt-4 text-sm">
          <div className="font-semibold">{admin.name}</div>
          <div className="text-xs text-slate-400">{admin.email}</div>
          <button onClick={logout} className="mt-3 text-xs font-semibold text-accent hover:underline">Keluar</button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* ---------- Top bar (HP) ---------- */}
        <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white md:hidden">
          <div className="min-w-0">
            <div className="text-lg font-extrabold leading-tight">KETU<span className="text-accent">PAT</span></div>
          </div>
          <div className="truncate pl-3 text-sm font-semibold text-slate-200">{current ? `${current[2]} ${current[1]}` : ""}</div>
        </header>

        <main className="px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 md:p-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* ---------- Tab bar bawah (HP) ---------- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Navigasi utama">
        <div className="grid grid-cols-5">
          {PRIMARY.map(([to, label, icon]) => {
            const active = isActivePath(pathname, to);
            return (
              <NavLink key={to} to={to} end={to === "/"} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-electric" : "text-slate-500"}`}>
                <span className="text-xl leading-none">{icon}</span>
                {label}
              </NavLink>
            );
          })}
          <button onClick={() => setMoreOpen(true)} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${moreActive ? "text-electric" : "text-slate-500"}`}>
            <span className="text-xl leading-none">☰</span>
            Lainnya
          </button>
        </div>
      </nav>

      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Menu lainnya">
        <div className="grid grid-cols-3 gap-2">
          {MORE.map(([to, label, icon]) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMoreOpen(false)}
              className={({ isActive }) => `flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold ${isActive ? "border-electric bg-blue-50 text-electric" : "border-slate-200 text-slate-600"}`}
            >
              <span className="text-2xl">{icon}</span>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
          <div className="font-semibold text-navy-900">{admin.name}</div>
          <div className="break-all text-xs text-slate-500">{admin.email}</div>
        </div>
        <button className="btn-danger mt-3 w-full" onClick={logout}>Keluar</button>
      </BottomSheet>
    </div>
  );
}
