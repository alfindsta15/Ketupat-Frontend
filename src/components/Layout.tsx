import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV = [
  ["/", "Dashboard", "📊"],
  ["/orders", "Orders", "📦"],
  ["/payments", "Payments", "💳"],
  ["/customers", "Customers", "👥"],
  ["/services", "Services", "🧰"],
  ["/reviews", "Reviews", "⭐"],
  ["/settings", "Settings", "⚙️"],
];

export default function Layout() {
  const { admin, loading, logout } = useAuth();
  if (loading) return <div className="p-10 text-slate-500">Memuat…</div>;
  if (!admin) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen">
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
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-electric text-white" : "text-slate-300 hover:bg-navy-700"
                }`
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
      <main className="min-w-0 flex-1 p-6 md:p-8">
        <div className="mb-4 flex items-center justify-between md:hidden">
          <div className="text-xl font-extrabold text-navy-900">KETU<span className="text-electric">PAT</span></div>
          <button onClick={logout} className="btn-ghost">Keluar</button>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${isActive ? "bg-navy-900 text-white" : "bg-white border"}`}>{label}</NavLink>
          ))}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
