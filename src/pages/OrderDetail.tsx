import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api, rupiah, fmtDate, ORDER_STATUSES, SERVICE_LABEL } from "../lib/api";
import { Badge, PageHeader } from "../components/ui";

export default function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/orders/${id}`).then((d) => { setO(d); setNote(d.adminNote ?? ""); if (d.price) setPrice(String(d.price)); });
  }, [id]);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true);
    setFlash(null);
    try { await fn(); setFlash({ ok: true, text: okText }); load(); }
    catch (e) { setFlash({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  if (!o) return <div className="text-slate-500">Memuat…</div>;
  const payment = o.payments?.[0];
  const brief = o.items?.map((i: any) => `${i.label}: ${i.value}`).join("\n");

  return (
    <>
      <Link to="/orders" className="mb-3 inline-block text-sm font-semibold text-electric">← Kembali</Link>
      <PageHeader title={`#${o.orderNumber}`} subtitle={`${SERVICE_LABEL[o.service] ?? o.service} • dibuat ${fmtDate(o.createdAt)}`} action={<Badge value={o.status} />} />
      {flash && <div className={`mb-4 rounded-lg p-3 text-sm ${flash.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{flash.text}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Detail Pesanan</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Customer</dt><dd className="font-semibold">{o.user?.name ?? "-"}</dd></div>
              <div><dt className="text-slate-500">WhatsApp</dt><dd className="font-semibold">{o.user?.phoneNumber}</dd></div>
              <div><dt className="text-slate-500">Deadline</dt><dd className="font-semibold">{o.deadline ?? "-"}</dd></div>
              <div><dt className="text-slate-500">Harga</dt><dd className="font-semibold">{rupiah(o.price)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Deskripsi</dt><dd className="whitespace-pre-wrap">{o.description}</dd></div>
              {brief && <div className="sm:col-span-2"><dt className="text-slate-500">Referensi / File pendukung</dt><dd className="whitespace-pre-wrap break-all">{brief}</dd></div>}
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Pembayaran</h2>
            {!payment && <p className="text-sm text-slate-400">Belum ada pembayaran.</p>}
            {payment && (
              <div className="flex flex-wrap items-start gap-5">
                {payment.proofFile ? (
                  <a href={payment.proofFile} target="_blank" rel="noreferrer">
                    <img src={payment.proofFile} alt="Bukti pembayaran" className="h-40 rounded-lg border object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                    <span className="mt-1 block text-xs text-electric">Buka bukti</span>
                  </a>
                ) : <span className="text-sm text-slate-400">Belum ada bukti.</span>}
                <div className="space-y-2 text-sm">
                  <div>Nominal: <b>{rupiah(payment.amount)}</b></div>
                  <div>Status: <Badge value={payment.status} /></div>
                  {payment.verifiedAt && <div className="text-slate-500">Diverifikasi {fmtDate(payment.verifiedAt)} oleh {payment.admin?.name}</div>}
                  {payment.status === "REVIEW" && (
                    <div className="flex gap-2 pt-2">
                      <button className="btn-primary" disabled={busy} onClick={() => run(() => api(`/payments/${payment.id}/verify`, { method: "POST" }), "Pembayaran diverifikasi & customer diberi tahu.")}>✓ VERIFIKASI PEMBAYARAN</button>
                      <button className="btn-danger" disabled={busy} onClick={() => run(() => api(`/payments/${payment.id}/reject`, { method: "POST" }), "Pembayaran ditolak.")}>Tolak</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Riwayat Chat</h2>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
              {o.messages?.map((m: any) => (
                <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : ""}`}>
                  <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.direction === "OUT" ? "bg-electric text-white" : "bg-white border"}`}>
                    {m.message}
                    <div className={`mt-1 text-[10px] ${m.direction === "OUT" ? "text-blue-100" : "text-slate-400"}`}>{fmtDate(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input" placeholder="Tulis pesan ke customer…" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <button className="btn-primary" disabled={busy || !msg.trim()} onClick={() => run(async () => { await api(`/orders/${id}/message`, { method: "POST", json: { message: msg } }); setMsg(""); }, "Pesan terkirim.")}>Kirim</button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Quotation</h2>
            <label className="mb-1 block text-xs font-semibold text-slate-500">HARGA (Rp)</label>
            <input className="input mb-2" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            <textarea className="input mb-3" rows={2} placeholder="Catatan (opsional)" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} />
            <button className="btn-accent w-full" disabled={busy || !Number(price)} onClick={() => run(() => api(`/orders/${id}/quotation`, { method: "POST", json: { price: Number(price), note: quoteNote || undefined } }), "Quotation dikirim ke customer.")}>💰 Kirim Quotation</button>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Ubah Status</h2>
            <select className="input" value={o.status} disabled={busy} onChange={(e) => run(() => api(`/orders/${id}/status`, { method: "PATCH", json: { status: e.target.value } }), "Status diperbarui.")}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
            <p className="mt-2 text-xs text-slate-400">Pilih REVIEW untuk meminta rating dari customer.</p>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Hasil Pekerjaan</h2>
            {o.resultUrl && <a href={o.resultUrl} target="_blank" rel="noreferrer" className="mb-2 block break-all text-sm text-electric">{o.resultUrl}</a>}
            <input type="file" className="mb-3 block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn-primary w-full" disabled={busy || !file} onClick={() => run(async () => { const fd = new FormData(); fd.append("file", file!); await api(`/orders/${id}/result`, { method: "POST", body: fd }); setFile(null); }, "File diupload, order SELESAI & customer diberi tahu.")}>Upload & Tandai Selesai</button>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-bold text-navy-900">Catatan Admin</h2>
            <textarea className="input mb-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-ghost w-full" disabled={busy} onClick={() => run(() => api(`/orders/${id}/note`, { method: "PATCH", json: { adminNote: note } }), "Catatan disimpan.")}>Simpan catatan</button>
          </section>

          {o.review && (
            <section className="card p-5">
              <h2 className="mb-2 font-bold text-navy-900">Review Customer</h2>
              <div className="text-lg">{"⭐".repeat(o.review.rating)}</div>
              <p className="text-sm text-slate-600">{o.review.feedback ?? "(tanpa komentar)"}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
