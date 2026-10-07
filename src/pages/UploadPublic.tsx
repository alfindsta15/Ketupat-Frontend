import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, apiUrl, rupiah, fmtSize } from "../lib/api";
import { FileButton } from "../components/ui";

interface Info {
  orderNumber: string;
  serviceLabel: string;
  customerName?: string | null;
  status: string;
  price?: number | null;
  dpAmount?: number | null;
  finalAmount?: number | null;
  paymentStatus?: string | null;
  paymentKind?: string | null;
  amountDue?: number | null;
  hasResult: boolean;
  previews: { id: number }[];
  unlocked: boolean;
  results: { id: number; filename: string; size?: number | null }[];
  externalLink?: string | null;
  hasExternalLink: boolean;
  resultNote?: string | null;
  canRequestRevision: boolean;
  revisionCount: number;
  maxRevisions: number;
  dynamicQris?: boolean;
  proofUploaded: boolean;
  qrisUrl?: string | null;
  closed: boolean;
  canUploadProof: boolean;
  canUploadReference: boolean;
}

const MAX_MB = 5;
type Flash = { ok: boolean; text: string } | null;

function FlashBox({ flash }: { flash: Flash }) {
  if (!flash) return null;
  return (
    <div className={`mt-3 rounded-lg p-3 text-sm ${flash.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {flash.text}
    </div>
  );
}

/**
 * Pratinjau hasil yang dilindungi: gambar sudah ber-watermark & beresolusi rendah dari server, ditambah
 * pencegahan simpan/salin/cetak di halaman ini, dan disamarkan saat jendela tidak aktif atau saat
 * tombol screenshot/cetak ditekan. (Screenshot oleh perangkat tidak bisa dicegah sepenuhnya oleh web,
 * karena itu watermark menyatu di gambar.)
 */
function ProtectedPreview({ token, ids, label, locked }: { token: string; ids: number[]; label: string; locked: boolean }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!locked) return;
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const combo =
        k === "printscreen" ||
        ((e.ctrlKey || e.metaKey) && ["p", "s", "c", "u"].includes(k)) ||
        (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k));
      if (combo) {
        e.preventDefault();
        setHidden(true);
        navigator.clipboard?.writeText("").catch(() => undefined);
        setTimeout(() => setHidden(false), 1500);
      }
    };
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [locked]);

  // Watermark ikut memuat waktu buka halaman, sehingga bocoran screenshot bisa dilacak.
  const stamp = useMemo(() => new Date().toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }), []);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='190'><text x='150' y='85' fill='rgba(15,23,42,0.24)' font-size='16' font-weight='700' text-anchor='middle' transform='rotate(-25 150 95)' font-family='sans-serif'>${label}</text><text x='150' y='108' fill='rgba(15,23,42,0.2)' font-size='13' text-anchor='middle' transform='rotate(-25 150 95)' font-family='sans-serif'>${stamp}</text></svg>`;
  const watermark = `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  const guard: React.CSSProperties = { userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties;

  return (
    <div className="space-y-3 print:hidden" style={guard} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
      {ids.map((id) => (
        <div key={id} className="relative overflow-hidden rounded-lg border bg-slate-100">
          <img
            src={apiUrl(`/public/upload/${token}/preview/${id}`)}
            alt="Pratinjau hasil"
            draggable={false}
            className="pointer-events-none block w-full transition"
            style={{ filter: hidden ? "blur(28px)" : "none" }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: watermark, backgroundRepeat: "repeat" }} />
          {hidden && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 p-4 text-center text-sm font-semibold text-slate-600">
              Pratinjau disembunyikan. Kembali ke halaman ini untuk melihatnya.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Halaman publik (tanpa login admin) untuk customer: bayar DP/pelunasan, pratinjau hasil, revisi, unduh hasil. */
export default function UploadPublic() {
  const { token } = useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setInfo(await api<Info>(`/public/upload/${token}`, { public: true }));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  // ---------- bukti pembayaran ----------
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofFlash, setProofFlash] = useState<Flash>(null);

  const pickProof = (f: File | null) => {
    setProofFlash(null);
    if (proofPreview) URL.revokeObjectURL(proofPreview);
    if (f && f.size > MAX_MB * 1024 * 1024) {
      setProof(null);
      setProofPreview(null);
      setProofFlash({ ok: false, text: `Ukuran file maksimal ${MAX_MB} MB. Perkecil dulu ya.` });
      return;
    }
    setProof(f);
    setProofPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  const sendProof = async () => {
    if (!proof) return;
    setProofBusy(true);
    setProofFlash(null);
    try {
      const fd = new FormData();
      fd.append("file", proof);
      await api(`/public/upload/${token}/proof`, { method: "POST", body: fd, public: true });
      setProofFlash({ ok: true, text: "Bukti pembayaran terkirim ✅ Mohon tunggu validasi admin. Kamu akan dapat kabar lewat WhatsApp." });
      pickProof(null);
      await load();
    } catch (e) {
      setProofFlash({ ok: false, text: (e as Error).message });
    } finally {
      setProofBusy(false);
    }
  };

  // ---------- referensi ----------
  const [refs, setRefs] = useState<File[]>([]);
  const [refNote, setRefNote] = useState("");
  const [refBusy, setRefBusy] = useState(false);
  const [refFlash, setRefFlash] = useState<Flash>(null);

  const pickRefs = (list: File[]) => {
    setRefFlash(null);
    const files = list.slice(0, 5);
    const tooBig = files.find((f) => f.size > MAX_MB * 2 * 1024 * 1024);
    if (tooBig) {
      setRefs([]);
      setRefFlash({ ok: false, text: `"${tooBig.name}" terlalu besar (maks ${MAX_MB * 2} MB per file).` });
      return;
    }
    setRefs(files);
  };

  const sendRefs = async () => {
    if (refs.length === 0 && !refNote.trim()) return;
    setRefBusy(true);
    setRefFlash(null);
    try {
      const fd = new FormData();
      refs.forEach((f) => fd.append("files", f));
      if (refNote.trim()) fd.append("note", refNote.trim());
      await api(`/public/upload/${token}/reference`, { method: "POST", body: fd, public: true });
      setRefFlash({ ok: true, text: "Referensi terkirim ✅ Terima kasih! Admin akan melihatnya di pesananmu." });
      setRefs([]);
      setRefNote("");
    } catch (e) {
      setRefFlash({ ok: false, text: (e as Error).message });
    } finally {
      setRefBusy(false);
    }
  };

  // ---------- revisi ----------
  const [revOpen, setRevOpen] = useState(false);
  const [revNote, setRevNote] = useState("");
  const [revBusy, setRevBusy] = useState(false);
  const [revFlash, setRevFlash] = useState<Flash>(null);

  const sendRevision = async () => {
    if (revNote.trim().length < 5) {
      setRevFlash({ ok: false, text: "Jelaskan bagian yang perlu diperbaiki (minimal 5 karakter)." });
      return;
    }
    setRevBusy(true);
    setRevFlash(null);
    try {
      await api(`/public/upload/${token}/revision`, { method: "POST", json: { note: revNote.trim() }, public: true });
      setRevNote("");
      setRevOpen(false);
      setRevFlash({ ok: true, text: "Permintaan revisi terkirim ✅ Kami perbaiki dulu, lalu kirim pratinjau terbaru lewat WhatsApp." });
      await load();
    } catch (e) {
      setRevFlash({ ok: false, text: (e as Error).message });
    } finally {
      setRevBusy(false);
    }
  };

  const payTitle = info?.paymentKind === "FINAL" ? "Pelunasan 50%" : info?.paymentKind === "DP" ? "Bayar DP 50%" : "Bukti Pembayaran";

  return (
    <div className="min-h-screen-dvh bg-slate-50 px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 text-center">
          <div className="text-3xl font-extrabold text-navy-900">KETUPAT</div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kerjakan Tugas Cepat &amp; Tepat</div>
        </div>

        {!info && !error && <div className="card p-6 text-center text-sm text-slate-500">Memuat…</div>}

        {error && (
          <div className="card p-6 text-center">
            <div className="text-3xl">🔒</div>
            <h1 className="mt-2 font-bold text-navy-900">Link tidak valid</h1>
            <p className="mt-1 text-sm text-slate-500">{error} Silakan minta link baru lewat chat WhatsApp KETUPAT.</p>
          </div>
        )}

        {info && (
          <div className="space-y-5">
            <div className="card p-4 sm:p-5">
              <div className="text-xs font-semibold uppercase text-slate-500">Pesanan</div>
              <div className="text-xl font-extrabold text-navy-900">#{info.orderNumber}</div>
              <div className="mt-1 text-sm text-slate-600">
                {info.serviceLabel}
                {info.customerName ? ` • ${info.customerName}` : ""}
              </div>
              {info.price ? (
                <div className="mt-2 space-y-0.5 text-sm">
                  <div>Total: <b>{rupiah(info.price)}</b></div>
                  {info.dpAmount ? <div className="text-xs text-slate-500">DP 50% {rupiah(info.dpAmount)} (di awal) • Pelunasan {rupiah(info.finalAmount)} (setelah pratinjau hasil)</div> : null}
                </div>
              ) : null}
            </div>

            {info.closed && (
              <div className="card p-5 text-center text-sm text-slate-600">
                Pesanan ini sudah <b>{info.status === "COMPLETED" ? "selesai" : "dibatalkan"}</b>, jadi upload ditutup.{info.status === "COMPLETED" && info.hasResult ? " Hasilmu bisa diunduh di bawah." : ""} Terima kasih! 🙏
              </div>
            )}

            {/* ---------- Bukti pembayaran ---------- */}
            {info.canUploadProof && (
              <section className="card p-4 sm:p-5">
                <h2 className="font-bold text-navy-900">💳 {payTitle}</h2>
                {info.amountDue ? (
                  <div className="mt-2 rounded-lg bg-slate-50 p-3 text-sm">
                    Nominal yang dibayar: <b className="text-navy-900">{rupiah(info.amountDue)}</b>
                    {info.paymentKind === "DP" && <div className="mt-0.5 text-xs text-slate-500">Sisa {rupiah(info.finalAmount)} dibayar setelah pratinjau hasil.</div>}
                  </div>
                ) : null}

                {info.proofUploaded && info.status === "PAYMENT_REVIEW" && (
                  <div className="mt-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-700">
                    ⏳ Bukti sudah kami terima dan sedang <b>divalidasi admin</b>. Kamu bisa upload ulang bila salah file.
                  </div>
                )}

                {info.dynamicQris && (info.status === "WAITING_PAYMENT" || info.status === "WAITING_FINAL_PAYMENT") && (
                  <div className="mt-3 rounded-lg border bg-white p-3 text-center">
                    <img
                      src={apiUrl(`/public/upload/${token}/qris.svg`) + `?a=${info.amountDue ?? 0}`}
                      alt={`QRIS ${rupiah(info.amountDue)}`}
                      className="mx-auto w-full max-w-[280px]"
                    />
                    <div className="mt-2 text-sm">Scan dengan aplikasi pembayaran apa pun. Nominal <b>{rupiah(info.amountDue)}</b> sudah terisi otomatis.</div>
                    <div className="mt-1 text-xs text-slate-400">Tidak bisa scan? Tekan lama gambar untuk menyimpan, lalu scan dari galeri.</div>
                  </div>
                )}
                {!info.dynamicQris && info.qrisUrl && (info.status === "WAITING_PAYMENT" || info.status === "WAITING_FINAL_PAYMENT") && (
                  <p className="mt-3 text-sm text-slate-600">
                    Belum bayar? Buka{" "}
                    <a href={info.qrisUrl} target="_blank" rel="noreferrer" className="font-semibold text-electric underline">link QRIS</a>{" "}
                    lalu transfer sebesar <b>{rupiah(info.amountDue ?? info.price)}</b>.
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <FileButton accept="image/*" capture="environment" className="!min-h-[52px] flex-col !gap-0.5 !py-2 text-xs" label={<><span className="text-xl leading-none">📷</span>Ambil foto</>} onFiles={(f) => pickProof(f[0] ?? null)} />
                  <FileButton accept="image/*,application/pdf" className="!min-h-[52px] flex-col !gap-0.5 !py-2 text-xs" label={<><span className="text-xl leading-none">🖼️</span>Galeri / file</>} onFiles={(f) => pickProof(f[0] ?? null)} />
                </div>
                {proofPreview && <img src={proofPreview} alt="Pratinjau bukti" className="mt-3 max-h-64 rounded-lg border object-contain" />}
                {proof && <div className="mt-2 truncate text-xs text-slate-500">{proof.name} ({fmtSize(proof.size)})</div>}

                <button className="btn-primary mt-4 w-full !min-h-[52px] text-base" disabled={!proof || proofBusy} onClick={sendProof}>
                  {proofBusy ? "Mengunggah…" : info.paymentKind === "FINAL" ? "Kirim Bukti Pelunasan" : info.paymentKind === "DP" ? "Kirim Bukti DP" : "Kirim Bukti Pembayaran"}
                </button>
                <p className="mt-2 text-xs text-slate-400">Foto/screenshot atau PDF, maksimal {MAX_MB} MB. Pastikan nominal & tanggal terlihat jelas.</p>
                <FlashBox flash={proofFlash} />
              </section>
            )}

            {!info.closed && !info.canUploadProof && info.status === "WAITING_QUOTATION" && (
              <div className="card p-5 text-sm text-slate-600">
                💳 Upload bukti pembayaran akan terbuka setelah admin mengirim <b>quotation</b> harga lewat WhatsApp.
              </div>
            )}

            {!info.closed && info.status === "PROCESSING" && !info.hasResult && (
              <div className="card p-5 text-sm text-slate-600">🔵 Pesananmu sedang <b>dikerjakan</b>. Pratinjau hasil akan muncul di halaman ini dan kami kabari lewat WhatsApp.</div>
            )}

            {/* ---------- Hasil pekerjaan: pratinjau + unduhan terkunci ---------- */}
            {info.hasResult && info.status !== "CANCELLED" && (
              <section
                className={`card p-4 sm:p-5 ${info.unlocked ? "" : "select-none print:hidden"}`}
                style={info.unlocked ? undefined : ({ userSelect: "none", WebkitUserSelect: "none", WebkitTouchCallout: "none" } as React.CSSProperties)}
                onCopy={info.unlocked ? undefined : (e) => e.preventDefault()}
                onCut={info.unlocked ? undefined : (e) => e.preventDefault()}
                onContextMenu={info.unlocked ? undefined : (e) => e.preventDefault()}
              >
                <h2 className="font-bold text-navy-900">🎁 Hasil Pekerjaan</h2>
                {info.previews.length > 0 && (
                  <>
                    <p className="mt-1 text-xs text-slate-500">
                      Pratinjau {info.unlocked ? "" : "(dilindungi): tidak bisa disalin/diunduh dan diberi watermark. "}File asli ada di bagian unduh di bawah.
                    </p>
                    <div className="mt-3">
                      <ProtectedPreview token={token!} ids={info.previews.map((p) => p.id)} label={`KETUPAT • #${info.orderNumber}`} locked={!info.unlocked} />
                    </div>
                  </>
                )}
                {info.resultNote && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-600">📝 {info.resultNote}</p>}

                <div className="mt-4 space-y-2">
                  {info.unlocked ? (
                    <>
                      {info.results.map((f) => (
                        <a key={f.id} href={apiUrl(`/public/upload/${token}/download/${f.id}`)} className="btn-primary w-full !min-h-[52px] break-all text-base">⬇️ Unduh {f.filename}{f.size ? ` (${fmtSize(f.size)})` : ""}</a>
                      ))}
                      {info.externalLink && <a href={info.externalLink} target="_blank" rel="noreferrer" className="btn-primary w-full !min-h-[52px] text-base">🔗 Buka link hasil</a>}
                      <p className="text-xs text-emerald-600">✅ Pelunasan terkonfirmasi, hasil sudah terbuka.</p>
                    </>
                  ) : (
                    <>
                      {info.results.map((f) => (
                        <button key={f.id} disabled className="btn-ghost w-full !min-h-[52px] cursor-not-allowed text-base opacity-60">🔒 Unduh {f.filename}</button>
                      ))}
                      {info.hasExternalLink && <button disabled className="btn-ghost w-full !min-h-[52px] cursor-not-allowed text-base opacity-60">🔒 Link hasil</button>}
                      <p className="text-xs text-slate-500">🔒 Terkunci. Otomatis terbuka setelah pelunasan {info.finalAmount ? rupiah(info.finalAmount) : ""} dikonfirmasi admin.</p>
                    </>
                  )}
                </div>

                {info.canRequestRevision && (
                  <div className="mt-4 border-t pt-4">
                    {!revOpen ? (
                      <button className="btn-ghost w-full !min-h-[48px]" onClick={() => setRevOpen(true)}>✍️ Ada yang perlu diperbaiki? Minta Revisi</button>
                    ) : (
                      <>
                        <label className="label">Bagian yang perlu diperbaiki</label>
                        <textarea className="input" rows={4} maxLength={2000} placeholder="Jelaskan sedetail mungkin, mis. halaman 3 grafiknya kurang jelas, warna judul diganti biru…" value={revNote} onChange={(e) => setRevNote(e.target.value)} />
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button className="btn-ghost" onClick={() => setRevOpen(false)} disabled={revBusy}>Batal</button>
                          <button className="btn-accent" onClick={sendRevision} disabled={revBusy}>{revBusy ? "Mengirim…" : "Kirim Revisi"}</button>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">Revisi ke-{info.revisionCount + 1} dari maks. {info.maxRevisions}. Setelah diperbaiki, kamu dapat pratinjau terbaru lalu baru melunasi.</p>
                      </>
                    )}
                  </div>
                )}
                <FlashBox flash={revFlash} />
              </section>
            )}

            {/* ---------- Referensi ---------- */}
            {info.canUploadReference && (
              <section className="card p-4 sm:p-5">
                <h2 className="font-bold text-navy-900">📎 Upload Referensi / File Pendukung</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Opsional. Foto, dokumen, mockup, dokumen kebutuhan, atau kode lama (.zip). Maksimal 5 file.
                </p>
                <FileButton
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
                  className="mt-4 w-full !min-h-[52px]"
                  label={<>📎 {refs.length ? "Ganti pilihan file" : "Pilih file (maks. 5)"}</>}
                  onFiles={(f) => pickRefs(f)}
                />
                {refs.length > 0 && (
                  <ul className="mt-2 space-y-1 break-all text-xs text-slate-500">
                    {refs.map((f) => <li key={f.name + f.size}>• {f.name} ({fmtSize(f.size)})</li>)}
                  </ul>
                )}
                <textarea
                  className="input mt-3"
                  rows={3}
                  placeholder="Catatan tambahan untuk admin (opsional)"
                  value={refNote}
                  onChange={(e) => setRefNote(e.target.value)}
                />
                <button className="btn-accent mt-3 w-full !min-h-[52px] text-base" disabled={refBusy || (refs.length === 0 && !refNote.trim())} onClick={sendRefs}>
                  {refBusy ? "Mengunggah…" : "Kirim Referensi"}
                </button>
                <FlashBox flash={refFlash} />
              </section>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">Link ini khusus untuk pesananmu. Jangan dibagikan ke orang lain ya 🙏</p>
      </div>
    </div>
  );
}
