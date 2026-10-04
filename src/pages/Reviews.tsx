import { useEffect, useState } from "react";
import { api, fmtDate, SERVICE_LABEL } from "../lib/api";
import { Empty, PageHeader } from "../components/ui";

export default function Reviews() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/orders/reviews").then(setRows); }, []);
  const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "-";

  return (
    <>
      <PageHeader title="Reviews" subtitle={`Rata-rata rating: ${avg} ⭐ (${rows.length} ulasan)`} />
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {rows.map((r) => (
          <div key={r.id} className="card p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-electric">#{r.order.orderNumber}</span>
              <span className="text-xs text-slate-400">{fmtDate(r.createdAt)}</span>
            </div>
            <div className="mt-1 text-lg">{"⭐".repeat(r.rating)}</div>
            <p className="mt-1 text-sm text-slate-600">{r.feedback ?? "(tanpa komentar)"}</p>
            <div className="mt-2 text-xs text-slate-400">{SERVICE_LABEL[r.order.service] ?? r.order.service}</div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <div className="card"><Empty text="Belum ada review." /></div>}
    </>
  );
}
