import { ReactNode } from "react";

const STATUS_STYLE: Record<string, string> = {
  WAITING_BRIEF: "bg-slate-100 text-slate-600",
  WAITING_QUOTATION: "bg-amber-100 text-amber-700",
  WAITING_PAYMENT: "bg-orange-100 text-orange-700",
  PAYMENT_REVIEW: "bg-purple-100 text-purple-700",
  PAID: "bg-emerald-100 text-emerald-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  REVIEW: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-slate-100 text-slate-600",
  REJECTED: "bg-red-100 text-red-700",
};

export function Badge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-slate-400">-</span>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[value] ?? "bg-slate-100"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-navy-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={`card p-5 ${accent ? "bg-navy-900 text-white border-navy-900" : ""}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide ${accent ? "text-accent" : "text-slate-500"}`}>{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-slate-400">{text}</div>;
}
