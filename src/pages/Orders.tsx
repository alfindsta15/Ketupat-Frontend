import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupiah, ORDER_STATUSES, SERVICE_LABEL } from "../lib/api";
import { Badge, Empty, PageHeader } from "../components/ui";

export default function Orders() {
  const [rows, setRows] = useState<any[]>([]);
  const [pg, setPg] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ sort, page: String(page), limit: "10" });
      if (search) qs.set("search", search);
      if (status) qs.set("status", status);
      if (paymentStatus) qs.set("paymentStatus", paymentStatus);
      setLoading(true);
      api(`/orders?${qs}`).then((r) => { setRows(r.data); setPg(r.pagination); }).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, status, paymentStatus, sort, page]);

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { setPage(1); fn(v); };

  return (
    <>
      <PageHeader title="Orders" subtitle={`${pg.total} order`} />
      <div className="card mb-4 grid gap-3 p-4 md:grid-cols-4">
        <input className="input" placeholder="Cari ID / nama / nomor WA…" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <select className="input" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <option value="">Semua status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input" value={paymentStatus} onChange={(e) => reset(setPaymentStatus)(e.target.value)}>
          <option value="">Semua pembayaran</option>
          {["PENDING", "REVIEW", "PAID", "REJECTED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" value={sort} onChange={(e) => reset(setSort)(e.target.value)}>
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="price_desc">Harga tertinggi</option>
          <option value="price_asc">Harga terendah</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="border-b bg-slate-50">
            <tr>{["Order ID", "Customer", "Service", "Deadline", "Price", "Payment", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="td font-semibold text-electric">#{o.orderNumber}</td>
                <td className="td">{o.user?.name ?? "-"}<div className="text-xs text-slate-400">{o.user?.phoneNumber}</div></td>
                <td className="td">{SERVICE_LABEL[o.service] ?? o.service}</td>
                <td className="td">{o.deadline ?? "-"}</td>
                <td className="td">{rupiah(o.price)}</td>
                <td className="td"><Badge value={o.payments?.[0]?.status ?? "PENDING"} /></td>
                <td className="td"><Badge value={o.status} /></td>
                <td className="td"><Link to={`/orders/${o.id}`} className="btn-ghost !py-1">Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && rows.length === 0 && <Empty text="Tidak ada order yang cocok." />}
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-slate-500">Halaman {pg.page} dari {Math.max(pg.totalPages, 1)}</span>
        <div className="flex gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Sebelumnya</button>
          <button className="btn-ghost" disabled={page >= pg.totalPages} onClick={() => setPage(page + 1)}>Berikutnya →</button>
        </div>
      </div>
    </>
  );
}
