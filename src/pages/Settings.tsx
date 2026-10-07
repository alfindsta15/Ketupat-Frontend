import { useEffect, useState } from "react";
import { api, fetchBlobUrl, fmtSize } from "../lib/api";
import { Flash, FileButton, PageHeader } from "../components/ui";

export default function Settings() {
  const [qris, setQris] = useState<{ url: string; filename: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dyn, setDyn] = useState<{ enabled: boolean; merchant: string | null } | null>(null);
  const [payload, setPayload] = useState("");
  const [scanNote, setScanNote] = useState<string | null>(null);
  const [testAmount, setTestAmount] = useState("10000");
  const [testQr, setTestQr] = useState<string | null>(null);

  const makeTestQr = async () => {
    setFlash(null);
    try {
      if (testQr) URL.revokeObjectURL(testQr);
      setTestQr(await fetchBlobUrl(`/settings/qris/preview.svg?amount=${encodeURIComponent(testAmount)}&t=${Date.now()}`));
    } catch (e) {
      setTestQr(null);
      setFlash({ ok: false, text: (e as Error).message });
    }
  };

  const loadDyn = () => api("/settings/qris/dynamic").then(setDyn).catch(() => setDyn(null));
  const load = () => { loadDyn(); return api("/settings/qris").then(setQris); };
  useEffect(() => { load(); }, []);

  /** Coba baca teks QRIS otomatis dari gambar (didukung Chrome/Edge/Android). Gagal = isi manual. */
  const tryScan = async (f: File | null) => {
    setScanNote(null);
    if (!f) return;
    try {
      const Detector = (window as any).BarcodeDetector;
      if (!Detector) { setScanNote("Browser ini belum bisa membaca QR otomatis. Salin teks QRIS secara manual (lihat petunjuk di bawah)."); return; }
      const bitmap = await createImageBitmap(f);
      const found = await new Detector({ formats: ["qr_code"] }).detect(bitmap);
      const raw: string | undefined = found?.[0]?.rawValue;
      if (raw && raw.startsWith("000201")) { setPayload(raw); setScanNote("Kode QRIS terbaca otomatis dari gambar ✅ Periksa lalu klik Aktifkan."); }
      else setScanNote("Kode QR di gambar tidak terbaca. Salin teks QRIS secara manual.");
    } catch {
      setScanNote("Gagal membaca gambar. Salin teks QRIS secara manual.");
    }
  };

  const pick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    tryScan(f);
  };

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setFlash(null);
    try { await fn(); setFlash({ ok: true, text: ok }); await load(); }
    catch (e) { setFlash({ ok: false, text: (e as Error).message }); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Pembayaran → QRIS (dikirim ke customer sebagai link)" />
      <Flash flash={flash} />
      <p className="mb-4 max-w-3xl text-sm text-slate-500">
        Bot mengirim QRIS sebagai <b>link</b> yang bisa di-klik/scan customer, bukan sebagai lampiran gambar WhatsApp.
        Kamu bisa upload gambar QRIS (otomatis jadi link) atau tempel link QRIS yang sudah kamu hosting sendiri.
      </p>
      <div className="grid max-w-3xl gap-4 md:grid-cols-2 md:gap-6">
        <section className="card p-4 md:p-5">
          <h2 className="mb-3 font-bold text-navy-900">QRIS Aktif</h2>
          {qris ? (
            <>
              <img src={qris.url} alt="QRIS aktif" className="mx-auto w-full max-w-xs rounded-lg border" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
              <p className="mt-2 truncate text-xs text-slate-400">{qris.filename}</p>
              <a href={qris.url} target="_blank" rel="noreferrer" className="mb-2 mt-1 block truncate text-xs text-electric">{qris.url}</a>
              <button className="btn-danger mt-1 w-full" disabled={busy} onClick={() => confirm("Hapus QRIS aktif?") && run(() => api("/settings/qris", { method: "DELETE" }), "QRIS dihapus.")}>Hapus QRIS</button>
            </>
          ) : <p className="text-sm text-slate-400">Belum ada QRIS. Bot akan memberi tahu customer bahwa link pembayaran belum tersedia.</p>}
        </section>

        <section className="card space-y-5 p-4 md:p-5">
          <div>
            <h2 className="mb-3 font-bold text-navy-900">{qris ? "Ganti via Upload" : "Upload QRIS"}</h2>
            <FileButton className="w-full" accept="image/png,image/jpeg,image/webp" label={<>🖼️ {file ? "Ganti gambar" : "Pilih gambar QRIS"}</>} onFiles={(f) => pick(f[0] ?? null)} />
            {file && <p className="mt-2 truncate text-xs text-slate-500">{file.name} ({fmtSize(file.size)})</p>}
            {preview && <img src={preview} alt="Preview" className="my-3 w-full max-w-xs rounded-lg border" />}
            <button className="btn-primary mt-3 w-full" disabled={busy || !file} onClick={() => run(async () => { const fd = new FormData(); fd.append("file", file!); await api("/settings/qris", { method: "POST", body: fd }); pick(null); }, "QRIS berhasil diupload & linknya aktif.")}>Simpan dari Upload</button>
            <p className="mt-2 text-xs text-slate-400">PNG/JPG/WebP, maks. 5MB. Kami buatkan link publiknya otomatis.</p>
          </div>
          <div className="border-t pt-4">
            <h2 className="mb-3 font-bold text-navy-900">Atau Tempel Link QRIS</h2>
            <input className="input mb-3" type="url" inputMode="url" placeholder="https://contoh.com/qris-ketupat.png" value={link} onChange={(e) => setLink(e.target.value)} />
            <button className="btn-accent w-full" disabled={busy || !link.trim()} onClick={() => run(async () => { await api("/settings/qris/link", { method: "POST", json: { url: link.trim() } }); setLink(""); }, "Link QRIS berhasil disimpan & aktif.")}>Simpan Link</button>
            <p className="mt-2 text-xs text-slate-400">Pakai ini kalau gambar QRIS-nya sudah kamu hosting sendiri (Google Drive, dsb - pastikan link-nya publik).</p>
          </div>
        </section>
      </div>

      <section className="card mt-4 max-w-3xl p-4 md:mt-6 md:p-5">
        <h2 className="mb-1 font-bold text-navy-900">⚡ QRIS Dinamis (nominal otomatis)</h2>
        <p className="mb-3 text-sm text-slate-500">
          Gratis, tanpa payment gateway. Dari kode QRIS statis milikmu, sistem membuat QRIS baru untuk <b>setiap tagihan</b> (DP / pelunasan) dengan nominal yang sudah terisi, jadi customer tinggal scan.
          Pembayaran tetap divalidasi admin lewat bukti bayar.
        </p>
        {dyn?.enabled ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <span>✅ Aktif{dyn.merchant ? ` untuk merchant "${dyn.merchant}"` : ""}</span>
            <button className="btn-danger !py-1" disabled={busy} onClick={() => confirm("Matikan QRIS dinamis?") && run(() => api("/settings/qris/payload", { method: "DELETE" }), "QRIS dinamis dimatikan.")}>Matikan</button>
          </div>
        ) : (
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Belum aktif. Customer akan memakai QRIS gambar/link di atas.</div>
        )}
        {dyn?.enabled && (
          <div className="mb-4 rounded-lg border p-3">
            <div className="mb-2 text-sm font-semibold text-navy-900">🧪 Tes QR (yang akan dilihat customer)</div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1">
                <label className="label">Nominal contoh (Rp)</label>
                <input className="input" type="number" inputMode="numeric" min="1" value={testAmount} onChange={(e) => setTestAmount(e.target.value)} />
              </div>
              <button className="btn-accent" onClick={makeTestQr}>Buat QR contoh</button>
            </div>
            {testQr && (
              <div className="mt-3 text-center">
                <img src={testQr} alt="QR contoh" className="mx-auto w-full max-w-[260px] rounded border bg-white" />
                <p className="mt-2 text-xs text-slate-500">Scan dengan aplikasi pembayaranmu: nominal harus otomatis terisi <b>Rp{Number(testAmount || 0).toLocaleString("id-ID")}</b>. Cukup sampai layar konfirmasi, tidak perlu menyelesaikan pembayaran.</p>
              </div>
            )}
          </div>
        )}
        <label className="label">Teks kode QRIS (hasil scan QRIS statis)</label>
        <textarea className="input font-mono text-xs" rows={4} placeholder="000201010211…" value={payload} onChange={(e) => setPayload(e.target.value)} />
        {scanNote && <p className="mt-2 text-xs text-slate-600">{scanNote}</p>}
        <button className="btn-primary mt-3 w-full sm:w-auto" disabled={busy || payload.trim().length < 20}
          onClick={() => run(async () => { await api("/settings/qris/payload", { method: "POST", json: { payload: payload.trim() } }); setPayload(""); }, "QRIS dinamis aktif ✅ Setiap tagihan sekarang punya QR dengan nominal otomatis.")}>
          {dyn?.enabled ? "Perbarui Kode QRIS" : "Aktifkan QRIS Dinamis"}
        </button>
        <details className="mt-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-semibold">Cara mendapatkan teks kode QRIS</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Buka gambar QRIS statis tokomu, scan dengan aplikasi pemindai QR biasa (kamera HP / Google Lens / QR scanner).</li>
            <li>Salin <b>teks hasil scan</b> (diawali <code>000201</code>), jangan klik link jika muncul.</li>
            <li>Tempel di kolom di atas lalu klik Aktifkan. Sistem memeriksa checksum-nya otomatis.</li>
            <li>Tes sekali dengan nominal kecil memakai aplikasi pembayaranmu sendiri sebelum dipakai ke customer.</li>
          </ol>
        </details>
      </section>
    </>
  );
}
