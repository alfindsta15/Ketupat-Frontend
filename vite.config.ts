import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Saat `npm run dev`, backend lokal = `wrangler dev` (port 8787).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
      "/uploads": "http://localhost:8787",
    },
  },
});
