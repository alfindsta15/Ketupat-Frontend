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
      <PageHeader title="Customers" subtitle={`${rows.length} customer`} action={<input className="input !w-64" placeholder="Cari nama / nomor…" value={search} onChange={(e) => setSearch(e.target.value)} />} />
      <div className="card overflow-x-auto">
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
