import { useEffect, useState } from "react";
import { api, fmtSize } from "../lib/api";
import { Flash, FileButton, PageHeader } from "../components/ui";

export default function Settings() {
  const [qris, setQris] = useState<{ url: string; filename: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => api("/settings/qris").then(setQris);
  useEffect(() => { load(); }, []);

  const pick = (f: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
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
    </>
  );
}
