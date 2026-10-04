import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupiah, fmtDate, SERVICE_LABEL } from "../lib/api";
import { Badge, PageHeader, StatCard } from "../components/ui";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    api("/dashboard/stats").then(setStats);
    api("/orders?limit=6").then((r) => setRecent(r.data));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Ringkasan bisnis KETUPAT" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:gap-4 lg:grid-cols-5">
        <StatCard label="Total Orders" value={stats?.totalOrders ?? "…"} />
        <StatCard label="Pending Payment" value={stats?.pendingPayment ?? "…"} />
        <StatCard label="Processing" value={stats?.processing ?? "…"} />
        <StatCard label="Completed" value={stats?.completed ?? "…"} />
        <StatCard label="Revenue" value={stats ? rupiah(stats.revenue) : "…"} accent className="col-span-2 lg:col-span-1" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold text-navy-900">Order Terbaru</h2>
          <Link to="/orders" className="text-sm font-semibold text-electric">Lihat semua →</Link>
        </div>

        {/* HP: daftar kartu */}
        <ul className="divide-y md:hidden">
          {recent.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="flex items-center gap-3 p-4 active:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-electric">#{o.orderNumber}</span>
                    <Badge value={o.status} />
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-700">{o.user?.name ?? o.user?.phoneNumber}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{SERVICE_LABEL[o.service] ?? o.service} • {fmtDate(o.createdAt)}</div>
                </div>
                <span className="text-slate-300">›</span>
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop: tabel */}
        <table className="hidden w-full md:table">
          <tbody>
            {recent.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="td font-semibold"><Link to={`/orders/${o.id}`} className="text-electric">#{o.orderNumber}</Link></td>
                <td className="td">{o.user?.name ?? o.user?.phoneNumber}</td>
                <td className="td">{SERVICE_LABEL[o.service] ?? o.service}</td>
                <td className="td"><Badge value={o.status} /></td>
                <td className="td text-slate-500">{fmtDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recent.length === 0 && <div className="p-8 text-center text-sm text-slate-400">Belum ada order.</div>}
      </div>
    </>
  );
}
