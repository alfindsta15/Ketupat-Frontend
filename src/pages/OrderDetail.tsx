import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api, downloadAuthed, fileUrl, rupiah, fmtDate, fmtSize, ORDER_STATUSES, SERVICE_LABEL } from "../lib/api";
import { Badge, FileButton, Flash, KindTag, PageHeader } from "../components/ui";
import { buildResultPreviews, makeWatermarkedPreview } from "../lib/image";

const REFERENCE_LABELS = ["Referensi", "Catatan tambahan"];

export default function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState<any>(null);
  const [price, setPrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [resultLink, setResultLink] = useState("");
  const [resultNote, setResultNote] = useState("");
  const [payNote, setPayNote] = useState("");
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [building, setBuilding] = useState(false);
  const [previewInfo, setPreviewInfo] = useState("");
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Muat pertama kali: isi juga field form. Polling berikutnya hanya menyegarkan data (tidak menimpa ketikan admin).
  const load = useCallback(() => {
    api(`/orders/${id}`).then((d) => { setO(d); setNote(d.adminNote ?? ""); if (d.price) setPrice(String(d.price)); });
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    const t = setInterval(() => { api(`/orders/${id}`).then(setO).catch(() => undefined); }, 10000);
    return () => clearInterval(t);
  }, [id]);

  const run = async (fn: () => Promise<any>, okText: string) => {
    setBusy(true);
    setFlash(null);
    try { await fn(); setFlash({ ok: true, text: okText }); load(); }
    catch (e) { setFlash({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  if (!o) return <div className="text-slate-500">Memuat…</div>;

  const payment = o.payments?.[0]; // backend mengurutkan terbaru dulu
  const items: any[] = o.items ?? [];
  const briefItems = items.filter((i) => !REFERENCE_LABELS.includes(i.label) && i.label !== "Catatan hasil" && i.label !== "Permintaan revisi");
  const referenceItems = items.filter((i) => REFERENCE_LABELS.includes(i.label));
  const resultNotes = items.filter((i) => i.label === "Catatan hasil");
  const refFiles: any[] = (o.files ?? []).filter((f: any) => f.type === "REFERENCE");
  const kindWord = payment?.kind === "FINAL" ? "Pelunasan 50%" : payment?.kind === "DP" ? "DP 50%" : "Pembayaran";
  const kindEffect = payment?.kind === "FINAL"
    ? "Setelah lunas: file hasil terbuka untuk customer & pesanan SELESAI."
    : "Setelah lunas: pesanan masuk tahap PENGERJAAN" + (payment?.kind === "DP" ? " (pelunasan 50% ditagih setelah pratinjau hasil)." : ".");
  const revisionItems = items.filter((i) => i.label === "Permintaan revisi");
  const resultFiles: any[] = (o.files ?? []).filter((f: any) => f.type === "RESULT" || f.type === "PREVIEW");
  const paidTotal = (o.payments ?? []).filter((p: any) => p.status === "PAID").reduce((sum: number, p: any) => sum + p.amount, 0);
  const fullyPaid = !!o.price && paidTotal >= o.price;
  const dpAmount = o.price ? Math.round(o.price / 2) : 0;

  const statusCard = (
    <section className="card p-4 md:p-5">
      <h2 className="mb-3 font-bold text-navy-900">Ubah Status</h2>
      <select className="input" value={o.status} disabled={busy} onChange={(e) => run(() => api(`/orders/${id}/status`, { method: "PATCH", json: { status: e.target.value } }), "Status diperbarui & customer diberi tahu lewat WhatsApp.")}>
        {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
      </select>
      <p className="mt-2 text-xs text-slate-400">Setiap perubahan status otomatis dikirim ke customer lewat WhatsApp dan menyinkronkan status pembayaran. Pilih REVIEW untuk meminta rating.</p>
    </section>
  );

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(o.uploadUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* abaikan */ }
  };

  return (
    <>
      <Link to="/orders" className="mb-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-electric md:mb-3 md:min-h-0">← Kembali</Link>
      <PageHeader title={`#${o.orderNumber}`} subtitle={`${SERVICE_LABEL[o.service] ?? o.service} • dibuat ${fmtDate(o.createdAt)}`} action={<Badge value={o.status} />} />
      <Flash flash={flash} />

      {/* HP: ubah status dipindah ke atas agar cepat dijangkau */}
      <div className="mb-4 lg:hidden">{statusCard}</div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
        <div className="space-y-4 md:space-y-6 lg:col-span-2">
          <section className="card p-4 md:p-5">
            <h2 className="mb-3 font-bold text-navy-900">Detail Pesanan</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Customer</dt><dd className="font-semibold">{o.user?.name ?? "-"}</dd></div>
              <div><dt className="text-slate-500">WhatsApp</dt><dd className="font-semibold">{o.user?.phoneNumber}</dd></div>
              <div><dt className="text-slate-500">Deadline</dt><dd className="font-semibold">{o.deadline ?? "-"}</dd></div>
              <div><dt className="text-slate-500">Harga</dt><dd className="font-semibold">{rupiah(o.price)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">Deskripsi</dt><dd className="whitespace-pre-wrap">{o.description}</dd></div>
            </dl>
          </section>

          {briefItems.length > 0 && (
            <section className="card p-4 md:p-5">
              <h2 className="mb-1 font-bold text-navy-900">Brief Detail</h2>
              <p className="mb-3 text-xs text-slate-400">Jawaban customer atas pertanyaan khusus layanan ini (dipakai untuk menentukan harga).</p>
              <dl className="space-y-3 text-sm">
                {briefItems.map((i) => (
                  <div key={i.id}><dt className="text-slate-500">{i.label}</dt><dd className="whitespace-pre-wrap break-words font-medium">{i.value}</dd></div>
                ))}
              </dl>
            </section>
          )}

          <section className="card p-4 md:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-navy-900">Referensi & File Pendukung</h2>
              <button className="btn-ghost !px-3 !py-1 text-xs" onClick={copyLink}>{copied ? "✓ Tersalin" : "Salin link upload customer"}</button>
            </div>
            {referenceItems.length === 0 && refFiles.length === 0 && <p className="text-sm text-slate-400">Belum ada referensi dari customer.</p>}
            {referenceItems.map((i) => (
              <div key={i.id} className="mb-2 text-sm"><span className="text-slate-500">{i.label}: </span><span className="whitespace-pre-wrap break-all">{i.value}</span></div>
            ))}
            {refFiles.length > 0 && (
              <ul className="mt-2 space-y-2">
                {refFiles.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 text-sm">
                    {f.mimeType?.startsWith("image/") && <img src={fileUrl(f.url)} alt="" className="h-12 w-12 rounded border object-cover" />}
                    <a href={fileUrl(f.url)} target="_blank" rel="noreferrer" className="break-all font-semibold text-electric">{f.filename}</a>
                    <span className="text-xs text-slate-400">{fmtSize(f.size)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {revisionItems.length > 0 && (
            <section className="card border-amber-300 bg-amber-50 p-4 md:p-5">
              <h2 className="mb-2 font-bold text-amber-800">✍️ Permintaan Revisi dari Customer ({revisionItems.length})</h2>
              <ul className="space-y-2 text-sm">
                {revisionItems.map((i) => (
                  <li key={i.id} className="rounded-lg bg-white p-3"><div className="whitespace-pre-wrap break-words">{i.value}</div><div className="mt-1 text-[11px] text-slate-400">{fmtDate(i.createdAt)}</div></li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-amber-700">Perbaiki hasilnya, lalu kirim pratinjau terbaru lewat kartu "Hasil Pekerjaan".</p>
            </section>
          )}

          <section className="card p-4 md:p-5">
            <h2 className="mb-3 font-bold text-navy-900">Pembayaran</h2>
            {!payment && <p className="text-sm text-slate-400">Belum ada pembayaran. Kirim quotation dulu agar tagihan terbentuk.</p>}
            {payment && (
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-5">
                {payment.proofFile ? (
                  <a href={fileUrl(payment.proofFile)} target="_blank" rel="noreferrer">
                    <img src={fileUrl(payment.proofFile)} alt="Bukti pembayaran" className="max-h-64 w-full rounded-lg border object-contain sm:h-40 sm:w-auto sm:object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                    <span className="mt-1 block text-xs text-electric">Buka bukti</span>
                  </a>
                ) : <span className="text-sm text-slate-400">Customer belum upload bukti.</span>}
                <div className="min-w-0 flex-1 space-y-2 text-sm sm:min-w-[220px]">
                  <div>Nominal: <b>{rupiah(payment.amount)}</b><KindTag kind={payment.kind} /></div>
                  <div>Status: <Badge value={payment.status} /></div>
                  {payment.verifiedAt && <div className="text-slate-500">Diproses {fmtDate(payment.verifiedAt)} oleh {payment.admin?.name ?? "admin"}</div>}
                  {payment.status === "PAID" && <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">✅ {kindWord} sudah lunas.</div>}
                  {payment.status === "REVIEW" && (
                    <>
                      <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">{kindEffect}</p>
                      <textarea className="input" rows={2} placeholder="Catatan untuk customer / alasan penolakan (opsional)" value={payNote} onChange={(e) => setPayNote(e.target.value)} />
                      <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                        <button className="btn-primary" disabled={busy} onClick={() => run(async () => { await api(`/payments/${payment.id}/verify`, { method: "POST", json: { note: payNote || undefined } }); setPayNote(""); }, `${kindWord} diverifikasi & customer diberi tahu.`)}>✓ LUNAS {kindWord.toUpperCase()}</button>
                        <button className="btn-danger" disabled={busy} onClick={() => run(async () => { await api(`/payments/${payment.id}/reject`, { method: "POST", json: { note: payNote || undefined } }); setPayNote(""); }, "Bukti ditolak, customer diminta upload ulang.")}>✕ Tolak bukti</button>
                      </div>
                    </>
                  )}
                  {(payment.status === "PENDING" || payment.status === "REJECTED") && (
                    <>
                      <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700">
                        {payment.status === "REJECTED" ? "Bukti ditolak. Menunggu customer upload ulang." : `Menunggu customer upload bukti ${kindWord}.`} Tombol Lunas/Tolak aktif setelah bukti masuk.
                      </p>
                      <button className="text-xs font-semibold text-slate-500 underline" disabled={busy}
                        onClick={() => confirm(`Tandai ${kindWord} LUNAS tanpa bukti? Lakukan hanya bila pembayaran sudah kamu terima langsung.`) && run(async () => { await api(`/payments/${payment.id}/verify`, { method: "POST", json: { force: true } }); }, `${kindWord} ditandai lunas manual.`)}>
                        Tandai lunas manual (tanpa bukti)
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {o.payments?.length > 1 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-slate-500">Riwayat pembayaran ({o.payments.length})</summary>
                <ul className="mt-2 space-y-1">
                  {o.payments.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-2"><Badge value={p.status} /> {rupiah(p.amount)}<KindTag kind={p.kind} /> <span className="text-xs text-slate-400">{fmtDate(p.createdAt)}</span></li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="mb-3 font-bold text-navy-900">Riwayat Chat</h2>
            <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3">
              {o.messages?.map((m: any) => (
                <div key={m.id} className={`flex ${m.direction === "OUT" ? "justify-end" : ""}`}>
                  <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.direction === "OUT" ? "bg-electric text-white" : "bg-white border"}`}>
                    {m.message}
                    <div className={`mt-1 text-[10px] ${m.direction === "OUT" ? "text-blue-100" : "text-slate-400"}`}>{fmtDate(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input className="input min-w-0 flex-1" placeholder="Tulis pesan ke customer…" value={msg} onChange={(e) => setMsg(e.target.value)} />
              <button className="btn-primary" disabled={busy || !msg.trim()} onClick={() => run(async () => { await api(`/orders/${id}/message`, { method: "POST", json: { message: msg } }); setMsg(""); }, "Pesan terkirim.")}>Kirim</button>
            </div>
          </section>
        </div>

        <div className="space-y-4 md:space-y-6">
          <section className="card p-4 md:p-5">
            <h2 className="mb-3 font-bold text-navy-900">Quotation</h2>
            <label className="mb-1 block text-xs font-semibold text-slate-500">JUMLAH PEMBAYARAN (Rp)</label>
            <input className="input mb-2" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            {Number(price) > 0 && (
              <p className="mb-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                DP 50% <b>{rupiah(Math.round(Number(price) / 2))}</b> dibayar di awal • Pelunasan <b>{rupiah(Number(price) - Math.round(Number(price) / 2))}</b> setelah pratinjau hasil.
              </p>
            )}
            <label className="mb-1 block text-xs font-semibold text-slate-500">CATATAN (ikut terkirim ke customer)</label>
            <textarea className="input mb-3" rows={3} placeholder="mis. Harga sudah termasuk 1x revisi" value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} />
            <button className="btn-accent w-full" disabled={busy || !Number(price)} onClick={() => run(() => api(`/orders/${id}/quotation`, { method: "POST", json: { price: Number(price), note: quoteNote || undefined } }), "Quotation dikirim ke customer.")}>💰 Kirim Quotation</button>
          </section>

          <div className="hidden lg:block">{statusCard}</div>

          <section className="card p-4 md:p-5">
            <h2 className="mb-1 font-bold text-navy-900">Hasil Pekerjaan</h2>
            <p className="mb-3 text-xs text-slate-400">
              Customer lebih dulu menerima <b>pratinjau</b> (gambar ber-watermark). File asli <b>terkunci</b> dan otomatis terbuka setelah pelunasan 50% diverifikasi.
            </p>

            {o.resultUrl && /^https?:/i.test(o.resultUrl) && <a href={o.resultUrl} target="_blank" rel="noreferrer" className="mb-2 block break-all text-sm text-electric">🔗 {o.resultUrl}</a>}
            {resultFiles.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {resultFiles.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate">{f.type === "PREVIEW" ? "🖼️ Pratinjau" : "🔒 File asli"}: {f.filename}</span>
                    <button className="btn-ghost !px-2 !py-1 text-xs" onClick={() => downloadAuthed(`/orders/${id}/files/${f.id}/download`, f.filename).catch((e) => setFlash({ ok: false, text: (e as Error).message }))}>Unduh</button>
                  </li>
                ))}
              </ul>
            )}
            {resultNotes.map((n) => <p key={n.id} className="mb-2 rounded bg-slate-50 p-2 text-xs text-slate-600">📝 {n.value}</p>)}

            <label className="label">File hasil pekerjaan</label>
            <FileButton className="mb-1 w-full" label={<>📎 {file ? "Ganti file" : "Pilih file hasil"}</>} onFiles={(f) => setFile(f[0] ?? null)} />
            {file && <p className="mb-2 truncate text-xs text-slate-500">{file.name} ({fmtSize(file.size)})</p>}
            <p className="mb-3 mt-1 text-[11px] text-slate-400">Pratinjau dibuat <b>otomatis</b> dari file ini (gambar, PDF, teks/kode). Untuk Word/PPT/ZIP, customer melihat kartu terkunci; ekspor ke PDF bila ingin pratinjau isi.</p>
            <label className="mb-1 block text-xs font-semibold text-slate-500">ATAU LINK HASIL (Drive/GitHub/dll)</label>
            <input className="input mb-3" placeholder="https://…" value={resultLink} onChange={(e) => setResultLink(e.target.value)} />
            <label className="mb-1 block text-xs font-semibold text-slate-500">TAMBAH SCREENSHOT PRATINJAU (opsional, maks. 3)</label>
            <FileButton multiple accept="image/png,image/jpeg,image/webp" className="mb-3 w-full" label={<>🖼️ {previewFiles.length ? `${previewFiles.length} gambar dipilih` : "Pilih screenshot tambahan"}</>} onFiles={(f) => setPreviewFiles(f.slice(0, 3))} />
            <label className="mb-1 block text-xs font-semibold text-slate-500">CATATAN (ikut terkirim ke customer)</label>
            <textarea className="input mb-3" rows={3} placeholder="mis. Cara menjalankan, versi, atau info revisi" value={resultNote} onChange={(e) => setResultNote(e.target.value)} />
            <button
              className="btn-primary w-full"
              disabled={busy || building || (!file && !resultLink.trim()) || (!fullyPaid && paidTotal === 0)}
              onClick={() => run(async () => {
                const fd = new FormData();
                if (file) fd.append("file", file);
                if (resultLink.trim()) fd.append("resultLink", resultLink.trim());
                if (resultNote.trim()) fd.append("note", resultNote.trim());
                const label = `KETUPAT • #${o.orderNumber} • PRATINJAU`;
                setBuilding(true);
                let info = "";
                try {
                  const auto = await buildResultPreviews({ file, link: resultLink.trim(), label });
                  info = auto.info;
                  for (const f of auto.files) fd.append("previews", f);
                  for (const p of previewFiles) fd.append("previews", await makeWatermarkedPreview(p, label));
                } finally {
                  setBuilding(false);
                }
                await api(`/orders/${id}/result`, { method: "POST", body: fd });
                setFile(null); setResultLink(""); setResultNote(""); setPreviewFiles([]);
                setPreviewInfo(info);
              }, fullyPaid ? "Hasil terkirim, order SELESAI & customer diberi tahu." : "Hasil terkirim: pratinjau terlihat customer, file asli terkunci sampai pelunasan.")}
            >
              {building ? "Membuat pratinjau…" : fullyPaid ? "Kirim Hasil & Tandai Selesai" : "Kirim Hasil & Tagih Pelunasan"}
            </button>
            {previewInfo && <p className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">ℹ️ {previewInfo}</p>}
            {!fullyPaid && paidTotal === 0 && <p className="mt-2 text-xs text-amber-600">DP {rupiah(dpAmount)} belum diverifikasi, jadi hasil belum bisa dikirim.</p>}
          </section>

          <section className="card p-4 md:p-5">
            <h2 className="mb-3 font-bold text-navy-900">Catatan Admin (internal)</h2>
            <textarea className="input mb-2" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-ghost w-full" disabled={busy} onClick={() => run(() => api(`/orders/${id}/note`, { method: "PATCH", json: { adminNote: note } }), "Catatan disimpan.")}>Simpan catatan</button>
          </section>

          {o.review && (
            <section className="card p-4 md:p-5">
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
