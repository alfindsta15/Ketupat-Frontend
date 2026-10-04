import { useEffect, useState } from "react";
import { api, SERVICE_LABEL } from "../lib/api";
import { PageHeader } from "../components/ui";

export default function Services() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    api("/dashboard/stats").then((s) => setCounts(Object.fromEntries(s.byService.map((x: any) => [x.service, x.count]))));
  }, []);

  return (
    <>
      <PageHeader title="Services" subtitle="Layanan KETUPAT yang tersedia di bot WhatsApp" />
      <div className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
        {Object.entries(SERVICE_LABEL).map(([code, label], i) => (
          <div key={code} className="card p-4 md:p-5">
            <div className="text-xs font-bold text-accent">PILIHAN {i + 1}</div>
            <div className="mt-1 text-lg font-extrabold text-navy-900">{label}</div>
            <div className="mt-3 text-sm text-slate-500">{counts[code] ?? 0} order</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-400">Daftar layanan didefinisikan di <code>backend/src/utils/constants.ts</code>.</p>
    </>
  );
}
