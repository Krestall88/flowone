"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function AcknowledgeButton({ documentId }: { documentId: number }) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/acknowledge`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось отметить ознакомление");
      }

      window.location.reload();
    } catch {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={handle}
      className="border-slate-700 text-slate-200 hover:bg-slate-800"
    >
      {busy ? "..." : "Ознакомлен"}
    </Button>
  );
}
