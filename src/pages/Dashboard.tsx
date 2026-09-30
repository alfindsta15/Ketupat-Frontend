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
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Orders" value={stats?.totalOrders ?? "…"} />
        <StatCard label="Pending Payment" value={stats?.pendingPayment ?? "…"} />
        <StatCard label="Processing" value={stats?.processing ?? "…"} />
        <StatCard label="Completed" value={stats?.completed ?? "…"} />
        <StatCard label="Revenue" value={stats ? rupiah(stats.revenue) : "…"} accent />
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="font-bold text-navy-900">Order Terbaru</h2>
          <Link to="/orders" className="text-sm font-semibold text-electric">Lihat semua →</Link>
        </div>
        <table className="w-full">
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
            {recent.length === 0 && <tr><td className="p-8 text-center text-sm text-slate-400">Belum ada order.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
