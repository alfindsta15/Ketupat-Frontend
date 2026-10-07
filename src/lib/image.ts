/**
 * Pembuatan gambar PRATINJAU dari file hasil pekerjaan, seluruhnya di browser admin.
 * Hasilnya: gambar JPEG beresolusi rendah (lebar maks. 900px) dengan watermark miring berulang yang
 * menyatu di piksel. Teks dokumen TIDAK ikut (hanya gambar), jadi tidak bisa disalin; dan screenshot
 * tetap bertanda watermark.
 *
 *  - Gambar (jpg/png/webp)  -> 1 pratinjau
 *  - PDF                    -> sampai 5 halaman pertama (pdf.js dimuat dari CDN saat dibutuhkan)
 *  - Teks/kode (txt, py, js, …) -> cuplikan ~45 baris pertama
 *  - Lainnya (docx, pptx, zip, link, …) -> kartu info terkunci (nama, jenis, ukuran)
 */

const MAX_W = 900;
const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const TEXT_EXT = ["txt", "md", "js", "jsx", "ts", "tsx", "py", "java", "c", "cpp", "h", "cs", "php", "html", "css", "json", "xml", "sql", "sh", "rb", "go", "rs", "kt", "swift", "dart", "csv", "yml", "yaml", "ini", "log"];

const ext = (name: string) => (name.split(".").pop() ?? "").toLowerCase();
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function watermark(ctx: CanvasRenderingContext2D, w: number, h: number, label: string) {
  const fontSize = Math.max(16, Math.round(Math.min(w, h) / 14));
  ctx.save();
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const stepX = ctx.measureText(label).width + fontSize * 2;
  const stepY = fontSize * 3.2;
  const span = Math.hypot(w, h);
  for (let y = -span; y < span; y += stepY) {
    for (let x = -span; x < span; x += stepX) {
      ctx.lineWidth = Math.max(2, fontSize / 8);
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeText(label, x, y);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(label, x, y);
    }
  }
  ctx.restore();
}

async function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat pratinjau."))), "image/jpeg", 0.6)
  );
  return new File([blob], name, { type: "image/jpeg" });
}

function newCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  return { canvas, ctx };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* jatuh ke <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("File bukan gambar yang valid."));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Gambar -> pratinjau kecil ber-watermark. */
export async function makeWatermarkedPreview(file: File, label: string): Promise<File> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_W / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const { canvas, ctx } = newCanvas(w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  watermark(ctx, w, h, label);
  return toFile(canvas, file.name.replace(/\.[^.]+$/, "") + "-preview.jpg");
}

async function loadPdfJs(): Promise<any> {
  const w = window as any;
  if (!w.pdfjsLib) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDF_JS;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Pembaca PDF gagal dimuat (cek koneksi internet)."));
      document.head.appendChild(s);
    });
  }
  w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER;
  return w.pdfjsLib;
}

async function pdfPreviews(file: File, label: string, maxPages = 5): Promise<File[]> {
  const lib = await loadPdfJs();
  const pdf = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const out: File[] = [];
  const pages = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: MAX_W / base.width });
    const { canvas, ctx } = newCanvas(Math.round(viewport.width), Math.round(viewport.height));
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    watermark(ctx, canvas.width, canvas.height, label);
    out.push(await toFile(canvas, `halaman-${i}-preview.jpg`));
  }
  return out;
}

async function textPreview(file: File, label: string): Promise<File> {
  const raw = (await file.slice(0, 12000).text()).replace(/\t/g, "    ");
  const lines = raw.split(/\r?\n/).slice(0, 45).map((l) => (l.length > 95 ? l.slice(0, 95) + "…" : l));
  const lineH = 20;
  const { canvas, ctx } = newCanvas(MAX_W, Math.max(240, lines.length * lineH + 70));
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 14px sans-serif";
  ctx.fillText(`${file.name} • cuplikan awal`, 24, 28);
  ctx.fillStyle = "#0f172a";
  ctx.font = "14px monospace";
  lines.forEach((l, i) => ctx.fillText(l, 24, 58 + i * lineH));
  watermark(ctx, canvas.width, canvas.height, label);
  return toFile(canvas, "cuplikan-preview.jpg");
}

/** Kartu info untuk file yang isinya tidak bisa dirender di browser (docx, pptx, zip, link, …). */
function placeholderPreview(title: string, subtitle: string, icon: string, label: string): Promise<File> {
  const { canvas, ctx } = newCanvas(MAX_W, 420);
  const g = ctx.createLinearGradient(0, 0, MAX_W, 420);
  g.addColorStop(0, "#eef2ff");
  g.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MAX_W, 420);
  ctx.textAlign = "center";
  ctx.font = "88px sans-serif";
  ctx.fillText(icon, MAX_W / 2, 140);
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 24px sans-serif";
  const name = title.length > 48 ? title.slice(0, 47) + "…" : title;
  ctx.fillText(name, MAX_W / 2, 215);
  ctx.fillStyle = "#475569";
  ctx.font = "16px sans-serif";
  ctx.fillText(subtitle, MAX_W / 2, 250);
  ctx.fillText("🔒 Hasil sudah selesai • file terkunci sampai pelunasan", MAX_W / 2, 300);
  watermark(ctx, MAX_W, 420, label);
  return toFile(canvas, "info-preview.jpg");
}

export interface PreviewResult {
  files: File[];
  /** Penjelasan singkat untuk admin tentang pratinjau yang dibuat. */
  info: string;
}

/** Bangun pratinjau otomatis dari file hasil (atau link hasil). Tidak pernah gagal total: ada kartu info sebagai cadangan. */
export async function buildResultPreviews(opts: { file?: File | null; link?: string; label: string }): Promise<PreviewResult> {
  const { file, link, label } = opts;
  if (!file) {
    const host = (() => { try { return new URL(link ?? "").hostname; } catch { return "link"; } })();
    return { files: [await placeholderPreview("Hasil berupa link", host, "🔗", label)], info: "Hasil berupa link: customer melihat kartu terkunci." };
  }

  const e = ext(file.name);
  try {
    if (file.type.startsWith("image/") && !/hei[cf]/i.test(file.type)) {
      return { files: [await makeWatermarkedPreview(file, label)], info: "Pratinjau dibuat dari gambar." };
    }
    if (file.type === "application/pdf" || e === "pdf") {
      const pages = await pdfPreviews(file, label);
      return { files: pages, info: `Pratinjau dibuat dari ${pages.length} halaman PDF pertama.` };
    }
    if (file.type.startsWith("text/") || TEXT_EXT.includes(e)) {
      return { files: [await textPreview(file, label)], info: "Pratinjau dibuat dari cuplikan awal teks/kode." };
    }
  } catch (err) {
    const why = err instanceof Error ? err.message : "";
    return {
      files: [await placeholderPreview(file.name, `${e.toUpperCase() || "FILE"} • ${kb(file.size)}`, "📄", label)],
      info: `Pratinjau isi gagal dibuat (${why || "tidak diketahui"}); customer melihat kartu terkunci. Tambahkan screenshot manual bila perlu.`,
    };
  }

  const icon = ["zip", "rar", "7z"].includes(e) ? "📦" : ["doc", "docx"].includes(e) ? "📝" : ["ppt", "pptx"].includes(e) ? "📊" : ["xls", "xlsx"].includes(e) ? "📈" : "📄";
  return {
    files: [await placeholderPreview(file.name, `${e.toUpperCase() || "FILE"} • ${kb(file.size)}`, icon, label)],
    info: `Isi file ${e.toUpperCase() || ""} tidak bisa dirender di browser; customer melihat kartu terkunci. Ekspor ke PDF atau tambahkan screenshot manual bila ingin pratinjau isi.`,
  };
}
