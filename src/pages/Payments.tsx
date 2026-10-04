import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, fileUrl, rupiah, fmtDate } from "../lib/api";
import { Badge, BottomSheet, Empty, Flash, PageHeader } from "../components/ui";

type Action = "verify" | "reject";
interface Dialog { id: number; action: Action; orderNumber: string; amount: number }

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "REVIEW", label: "Perlu validasi" },
  { value: "PENDING", label: "Belum dibayar" },
  { value: "PAID", label: "Lunas" },
  { value: "REJECTED", label: "Ditolak" },
];

export default function Payments() {
  const [all, setAll] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setAll(await api<any[]>("/payments"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat saat dibuka + segarkan otomatis tiap 15 detik agar bukti baru dari customer langsung muncul.
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 15000);
    return () => clearInterval(t);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { "": all.length };
    for (const p of all) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [all]);

  const rows = useMemo(() => (status ? all.filter((p) => p.status === status) : all), [all, status]);
  const paidTotal = useMemo(() => all.filter((p) => p.status === "PAID").reduce((s, p) => s + (p.amount ?? 0), 0), [all]);

  const openDialog = (p: any, action: Action) => {
    setNote("");
    setDialog({ id: p.id, action, orderNumber: p.order.orderNumber, amount: p.amount });
  };

  const submit = async () => {
    if (!dialog) return;
    const { id, action } = dialog;
    setBusyId(id);
    setFlash(null);
    try {
      await api(`/payments/${id}/${action}`, { method: "POST", json: { note: note.trim() || undefined } });
      setFlash({
        ok: true,
        text: action === "verify" ? "Ditandai lunas & customer diberi tahu lewat WhatsApp." : "Ditolak & customer diminta upload ulang lewat WhatsApp.",
      });
      setDialog(null);
      await load(true);
    } catch (e) {
      setFlash({ ok: false, text: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Bukti pembayaran dari customer & validasi admin"
        action={<button className="btn-ghost" onClick={() => load()} disabled={loading}>↻ Muat ulang</button>}
      />

      <div className="mb-4 grid grid-cols-3 gap-2 md:gap-3">
        <div className="card p-3 md:p-4"><div className="text-[10px] font-semibold uppercase leading-tight text-slate-500 md:text-xs">Perlu validasi</div><div className="mt-1 text-xl font-extrabold text-purple-700 md:text-2xl">{counts.REVIEW ?? 0}</div></div>
        <div className="card p-3 md:p-4"><div className="text-[10px] font-semibold uppercase leading-tight text-slate-500 md:text-xs">Belum dibayar</div><div className="mt-1 text-xl font-extrabold text-orange-600 md:text-2xl">{counts.PENDING ?? 0}</div></div>
        <div className="card p-3 md:p-4"><div className="text-[10px] font-semibold uppercase leading-tight text-slate-500 md:text-xs">Total lunas</div><div className="mt-1 break-words text-base font-extrabold text-emerald-700 md:text-2xl">{rupiah(paidTotal)}</div></div>
      </div>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold md:py-1 ${status === f.value ? "border-electric bg-electric text-white" : "border-slate-300 bg-white text-slate-600"}`}
          >
            {f.label} ({counts[f.value] ?? 0})
          </button>
        ))}
      </div>

      <Flash flash={flash} />
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Gagal memuat pembayaran: {error}</div>}

      {/* HP: daftar kartu */}
      <ul className="space-y-3 md:hidden">
        {rows.map((p) => (
          <li key={p.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link to={`/orders/${p.orderId}`} className="font-bold text-electric">#{p.order.orderNumber}</Link>
                <div className="truncate text-sm text-slate-700">{p.order.user?.name ?? p.order.user?.phoneNumber}</div>
                <div className="text-[11px] text-slate-400">{fmtDate(p.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-navy-900">{rupiah(p.amount)}</div>
                <div className="mt-1 flex flex-wrap justify-end gap-1"><Badge value={p.status} /></div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              {p.proofFile ? (
                <a href={fileUrl(p.proofFile)} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                  <img src={fileUrl(p.proofFile)} alt="Bukti" className="h-14 w-14 rounded-lg border object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  <span className="text-xs font-semibold text-electric">Lihat bukti</span>
                </a>
              ) : (
                <span className="text-xs text-slate-400">{p.status === "PAID" ? "-" : "Belum upload bukti"}</span>
              )}
              <div className="ml-auto"><Badge value={p.order.status} /></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-primary" disabled={busyId === p.id || p.status === "PAID"} onClick={() => openDialog(p, "verify")}>✓ Lunas</button>
              <button className="btn-danger" disabled={busyId === p.id || p.status === "REJECTED" || p.status === "PAID"} onClick={() => openDialog(p, "reject")}>✕ Tolak</button>
            </div>
          </li>
        ))}
      </ul>
      {loading && rows.length === 0 && <div className="card md:hidden"><Empty text="Memuat pembayaran…" /></div>}
      {!loading && !error && rows.length === 0 && <div className="card md:hidden"><Empty text="Belum ada pembayaran pada filter ini." /></div>}

      {/* Desktop: tabel */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px]">
          <thead className="border-b bg-slate-50">
            <tr>{["Order", "Customer", "Nominal", "Pembayaran", "Status order", "Waktu", "Bukti", "Aksi"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="td font-semibold text-electric"><Link to={`/orders/${p.orderId}`}>#{p.order.orderNumber}</Link></td>
                <td className="td">{p.order.user?.name ?? p.order.user?.phoneNumber}</td>
                <td className="td">{rupiah(p.amount)}</td>
                <td className="td"><Badge value={p.status} /></td>
                <td className="td"><Badge value={p.order.status} /></td>
                <td className="td text-slate-500">{fmtDate(p.createdAt)}</td>
                <td className="td">
                  {p.proofFile ? (
                    <a href={fileUrl(p.proofFile)} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={fileUrl(p.proofFile)}
                        alt="Bukti"
                        className="h-12 w-12 rounded border object-cover"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                      />
                      <span className="text-xs font-semibold text-electric">Lihat bukti</span>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">{p.status === "PAID" ? "-" : "Belum upload"}</span>
                  )}
                </td>
                <td className="td">
                  <div className="flex gap-2">
                    <button className="btn-primary !px-2 !py-1 text-xs" disabled={busyId === p.id || p.status === "PAID"} onClick={() => openDialog(p, "verify")}>✓ Lunas</button>
                    <button className="btn-danger !px-2 !py-1 text-xs" disabled={busyId === p.id || p.status === "REJECTED" || p.status === "PAID"} onClick={() => openDialog(p, "reject")}>✕ Tolak</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && rows.length === 0 && <Empty text="Memuat pembayaran…" />}
        {!loading && !error && rows.length === 0 && <Empty text="Belum ada pembayaran pada filter ini." />}
      </div>

      <BottomSheet
        open={!!dialog}
        onClose={() => busyId === null && setDialog(null)}
        title={dialog ? `${dialog.action === "verify" ? "Tandai lunas" : "Tolak bukti pembayaran"} • #${dialog.orderNumber}` : undefined}
      >
        {dialog && (
          <>
            <p className="text-sm text-slate-500">Nominal {rupiah(dialog.amount)}. Customer otomatis diberi tahu lewat WhatsApp.</p>
            <label className="label mt-4">
              {dialog.action === "verify" ? "Catatan untuk customer (opsional)" : "Alasan penolakan (opsional, ikut terkirim)"}
            </label>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={dialog.action === "verify" ? "mis. Terima kasih, pengerjaan dimulai hari ini" : "mis. Nominal kurang Rp10.000"} />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button className="btn-ghost" onClick={() => setDialog(null)} disabled={busyId === dialog.id}>Batal</button>
              <button className={dialog.action === "verify" ? "btn-primary" : "btn-danger"} onClick={submit} disabled={busyId === dialog.id}>
                {busyId === dialog.id ? "Memproses…" : dialog.action === "verify" ? "Konfirmasi Lunas" : "Tolak & Kirim"}
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </>
  );
}
