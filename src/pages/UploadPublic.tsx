import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, rupiah, fmtSize } from "../lib/api";
import { FileButton } from "../components/ui";

interface Info {
  orderNumber: string;
  serviceLabel: string;
  customerName?: string | null;
  status: string;
  price?: number | null;
  paymentStatus?: string | null;
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

/** Halaman publik (tanpa login admin) untuk customer: upload bukti bayar & referensi. */
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
              {info.price ? <div className="mt-2 text-sm">Total tagihan: <b>{rupiah(info.price)}</b></div> : null}
            </div>

            {info.closed && (
              <div className="card p-5 text-center text-sm text-slate-600">
                Pesanan ini sudah <b>{info.status === "COMPLETED" ? "selesai" : "dibatalkan"}</b>, jadi upload sudah ditutup. Terima kasih! 🙏
              </div>
            )}

            {/* ---------- Bukti pembayaran ---------- */}
            {info.canUploadProof && (
              <section className="card p-4 sm:p-5">
                <h2 className="font-bold text-navy-900">💳 Upload Bukti Pembayaran</h2>

                {info.proofUploaded && info.status === "PAYMENT_REVIEW" && (
                  <div className="mt-3 rounded-lg bg-purple-50 p-3 text-sm text-purple-700">
                    ⏳ Bukti sudah kami terima dan sedang <b>divalidasi admin</b>. Kamu bisa upload ulang bila salah file.
                  </div>
                )}

                {info.qrisUrl && info.status === "WAITING_PAYMENT" && (
                  <p className="mt-3 text-sm text-slate-600">
                    Belum bayar? Buka{" "}
                    <a href={info.qrisUrl} target="_blank" rel="noreferrer" className="font-semibold text-electric underline">link QRIS</a>{" "}
                    lalu transfer sebesar <b>{rupiah(info.price)}</b>.
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <FileButton accept="image/*" capture="environment" className="!min-h-[52px] flex-col !gap-0.5 !py-2 text-xs" label={<><span className="text-xl leading-none">📷</span>Ambil foto</>} onFiles={(f) => pickProof(f[0] ?? null)} />
                  <FileButton accept="image/*,application/pdf" className="!min-h-[52px] flex-col !gap-0.5 !py-2 text-xs" label={<><span className="text-xl leading-none">🖼️</span>Galeri / file</>} onFiles={(f) => pickProof(f[0] ?? null)} />
                </div>
                {proofPreview && <img src={proofPreview} alt="Pratinjau bukti" className="mt-3 max-h-64 rounded-lg border object-contain" />}
                {proof && <div className="mt-2 truncate text-xs text-slate-500">{proof.name} ({fmtSize(proof.size)})</div>}

                <button className="btn-primary mt-4 w-full !min-h-[52px] text-base" disabled={!proof || proofBusy} onClick={sendProof}>
                  {proofBusy ? "Mengunggah…" : "Kirim Bukti Pembayaran"}
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
