import { useEffect, useState } from "react";
import { api, rupiah, fmtDate } from "../lib/api";
import { Empty, PageHeader } from "../components/ui";

export default function Customers() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => api(`/dashboard/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(setRows), 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${rows.length} customer`}
        action={<input className="input w-full sm:!w-64" type="search" placeholder="Cari nama / nomor…" value={search} onChange={(e) => setSearch(e.target.value)} />}
      />

      {/* HP: daftar kartu */}
      <ul className="space-y-3 md:hidden">
        {rows.map((c) => (
          <li key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold text-navy-900">{c.name ?? "-"}</div>
                <a href={`https://wa.me/${c.phoneNumber}`} target="_blank" rel="noreferrer" className="text-sm text-electric">{c.phoneNumber}</a>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold text-navy-900">{rupiah(c.totalSpent)}</div>
                <div className="text-xs text-slate-400">{c.totalOrders} order</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400">Bergabung {fmtDate(c.createdAt)}</div>
          </li>
        ))}
        {rows.length === 0 && <li className="card"><Empty text="Belum ada customer." /></li>}
      </ul>

      {/* Desktop: tabel */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[600px]">
          <thead className="border-b bg-slate-50"><tr>{["Nama", "WhatsApp", "Total Order", "Total Transaksi", "Bergabung"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="td font-semibold">{c.name ?? "-"}</td>
                <td className="td">{c.phoneNumber}</td>
                <td className="td">{c.totalOrders}</td>
                <td className="td">{rupiah(c.totalSpent)}</td>
                <td className="td text-slate-500">{fmtDate(c.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="Belum ada customer." />}
      </div>
    </>
  );
}
