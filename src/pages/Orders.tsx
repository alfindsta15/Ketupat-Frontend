import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupiah, fmtDate, ORDER_STATUSES, SERVICE_LABEL } from "../lib/api";
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

      <div className="card mb-4 grid grid-cols-2 gap-3 p-3 md:grid-cols-4 md:p-4">
        <input className="input col-span-2 md:col-span-1" type="search" placeholder="Cari ID / nama / nomor WA…" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        <select className="input" value={status} onChange={(e) => reset(setStatus)(e.target.value)}>
          <option value="">Semua status</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="input" value={paymentStatus} onChange={(e) => reset(setPaymentStatus)(e.target.value)}>
          <option value="">Semua pembayaran</option>
          {["PENDING", "REVIEW", "PAID", "REJECTED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input col-span-2 md:col-span-1" value={sort} onChange={(e) => reset(setSort)(e.target.value)}>
          <option value="newest">Terbaru</option>
          <option value="oldest">Terlama</option>
          <option value="price_desc">Harga tertinggi</option>
          <option value="price_asc">Harga terendah</option>
        </select>
      </div>

      {/* HP: daftar kartu */}
      <ul className="space-y-3 md:hidden">
        {rows.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="card block p-4 active:bg-slate-50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-electric">#{o.orderNumber}</div>
                  <div className="mt-0.5 truncate text-sm font-medium text-slate-800">{o.user?.name ?? "-"}</div>
                  <div className="text-xs text-slate-400">{o.user?.phoneNumber}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-navy-900">{rupiah(o.price)}</div>
                  <div className="mt-0.5 text-xs text-slate-400">{o.deadline ?? "-"}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500">{SERVICE_LABEL[o.service] ?? o.service}</span>
                <Badge value={o.status} />
                <Badge value={o.payments?.[0]?.status ?? "PENDING"} />
              </div>
              <div className="mt-2 text-[11px] text-slate-400">{fmtDate(o.createdAt)}</div>
            </Link>
          </li>
        ))}
        {!loading && rows.length === 0 && <li className="card"><Empty text="Tidak ada order yang cocok." /></li>}
        {loading && rows.length === 0 && <li className="card"><Empty text="Memuat…" /></li>}
      </ul>

      {/* Desktop: tabel */}
      <div className="card hidden overflow-x-auto md:block">
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

      <div className="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-center text-slate-500 sm:text-left">Halaman {pg.page} dari {Math.max(pg.totalPages, 1)}</span>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Sebelumnya</button>
          <button className="btn-ghost" disabled={page >= pg.totalPages} onClick={() => setPage(page + 1)}>Berikutnya →</button>
        </div>
      </div>
    </>
  );
}
