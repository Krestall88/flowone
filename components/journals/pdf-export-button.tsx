"use client";

import { useState } from "react";

export function PdfExportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(href, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("Не удалось получить PDF (возможно, нужна повторная авторизация)");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const disposition = res.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] ? match[1] : "journal.pdf";

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Ошибка экспорта";
      alert(`Не удалось экспортировать PDF: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm transition hover:border-emerald-500 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Экспорт..." : "Экспорт в PDF"}
    </button>
  );
}
