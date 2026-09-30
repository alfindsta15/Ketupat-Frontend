import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, rupiah, fmtDate } from "../lib/api";
import { Badge, Empty, PageHeader } from "../components/ui";

export default function Payments() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const load = () => api(`/payments${status ? `?status=${status}` : ""}`).then(setRows);
  useEffect(() => { load(); }, [status]);

  // Admin can adjust paid/not-paid status directly from this menu, without
  // opening the order detail page. Reuses the existing verify/reject
  // endpoints, which already notify the customer on WhatsApp either way.
  const act = async (id: number, action: "verify" | "reject") => {
    setBusyId(id);
    setFlash(null);
    try {
      await api(`/payments/${id}/${action}`, { method: "POST" });
      setFlash({
        ok: true,
        text: action === "verify" ? "Ditandai lunas & customer diberi tahu." : "Ditandai belum sesuai & customer diberi tahu.",
      });
      await load();
    } catch (e) {
      setFlash({ ok: false, text: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader title="Payments" subtitle="Bukti pembayaran & verifikasi" action={
        <select className="input !w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua</option>
          {["REVIEW", "PAID", "REJECTED", "PENDING"].map((s) => <option key={s}>{s}</option>)}
        </select>
      } />
      {flash && <div className={`mb-4 rounded-lg p-3 text-sm ${flash.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{flash.text}</div>}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead className="border-b bg-slate-50"><tr>{["Order", "Customer", "Nominal", "Status", "Waktu", "Bukti", "Aksi"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="td font-semibold text-electric"><Link to={`/orders/${p.orderId}`}>#{p.order.orderNumber}</Link></td>
                <td className="td">{p.order.user?.name ?? p.order.user?.phoneNumber}</td>
                <td className="td">{rupiah(p.amount)}</td>
                <td className="td"><Badge value={p.status} /></td>
                <td className="td text-slate-500">{fmtDate(p.createdAt)}</td>
                <td className="td">
                  {p.proofFile ? (
                    <a href={p.proofFile} target="_blank" rel="noreferrer" className="text-xs font-semibold text-electric">Lihat bukti</a>
                  ) : <span className="text-xs text-slate-400">-</span>}
                </td>
                <td className="td">
                  <div className="flex gap-2">
                    <button
                      className="btn-primary !px-2 !py-1 text-xs"
                      disabled={busyId === p.id || p.status === "PAID"}
                      onClick={() => act(p.id, "verify")}
                    >
                      ✓ Lunas
                    </button>
                    <button
                      className="btn-danger !px-2 !py-1 text-xs"
                      disabled={busyId === p.id || p.status === "REJECTED"}
                      onClick={() => act(p.id, "reject")}
                    >
                      ✕ Tolak
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text="Belum ada pembayaran." />}
      </div>
    </>
  );
}
