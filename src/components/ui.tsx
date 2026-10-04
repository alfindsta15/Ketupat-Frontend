import { ReactNode, useEffect } from "react";

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
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[value] ?? "bg-slate-100"}`}>
      {value.replace(/_/g, " ")}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-6">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold text-navy-900 md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, accent, className = "" }: { label: string; value: ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={`card p-4 md:p-5 ${accent ? "border-navy-900 bg-navy-900 text-white" : ""} ${className}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide md:text-xs ${accent ? "text-accent" : "text-slate-500"}`}>{label}</div>
      <div className="mt-1.5 break-words text-xl font-extrabold md:mt-2 md:text-2xl">{value}</div>
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="p-10 text-center text-sm text-slate-400">{text}</div>;
}

/** Kotak pesan sukses/gagal. */
export function Flash({ flash }: { flash: { ok: boolean; text: string } | null }) {
  if (!flash) return null;
  return (
    <div role="status" className={`mb-4 rounded-lg p-3 text-sm ${flash.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
      {flash.text}
    </div>
  );
}

/**
 * Modal: di HP tampil sebagai "bottom sheet" (menempel di bawah, mudah dijangkau ibu jari),
 * di layar lebar tampil sebagai dialog di tengah.
 */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button aria-label="Tutup" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 sm:hidden" />
        {title && <h2 className="mb-3 font-bold text-navy-900">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

/** Tombol pilih file yang besar & mudah disentuh (pengganti <input type="file"> bawaan browser). */
export function FileButton({
  label,
  accept,
  multiple,
  capture,
  onFiles,
  variant = "ghost",
  className = "",
}: {
  label: ReactNode;
  accept?: string;
  multiple?: boolean;
  capture?: "environment" | "user";
  onFiles: (files: File[]) => void;
  variant?: "ghost" | "primary" | "accent";
  className?: string;
}) {
  return (
    <label className={`btn-${variant} cursor-pointer ${className}`}>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        capture={capture}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = ""; // agar file yang sama bisa dipilih ulang
          onFiles(list);
        }}
      />
      {label}
    </label>
  );
}
