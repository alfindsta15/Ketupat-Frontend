# KETUPAT Frontend (React + Vite + Tailwind)

Dashboard admin KETUPAT dan halaman upload customer (`/upload/:token`). Dideploy di **Vercel**; API dilayani oleh Cloudflare Worker (repo Ketupat-Backend).

## Mulai cepat

```bash
npm install
npm run dev      # http://localhost:5173, /api & /uploads di-proxy ke http://localhost:8787 (wrangler dev)
npm run build
```

## Menghubungkan ke backend

1. Di `vercel.json`, ganti `GANTI-NAMA-WORKER.GANTI-SUBDOMAIN.workers.dev` (2 tempat) dengan host Worker, mis. `ketupat-api.akunku.workers.dev`.
2. *(Disarankan)* di Vercel → Settings → Environment Variables: `VITE_API_BASE_URL=https://ketupat-api.<akun>.workers.dev`, lalu Redeploy. Browser memanggil Worker langsung (lebih cepat, tanpa batas ukuran upload proxy).
3. Pastikan `FRONTEND_URL` di `wrangler.toml` backend sama dengan domain Vercel ini (untuk CORS dan link upload customer).

## Tampilan mobile

Tab bar bawah + menu "Lainnya", daftar kartu pengganti tabel, dialog berbentuk bottom sheet, tombol/input ≥44px, tombol "Ambil foto" untuk bukti bayar, dukungan safe-area iPhone. Komponen bersama ada di `src/components/ui.tsx` (`BottomSheet`, `FileButton`, `Flash`, `StatCard`, `Badge`).
