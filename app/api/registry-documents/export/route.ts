import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function getExpiryStatus(expiresAt: Date | null): "active" | "expiring" | "expired" | "no_expiry" {
  if (!expiresAt) return "no_expiry";
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

function getCanonicalObjectType(raw: string): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "chemicals" || v === "дезсредства" || v === "моющие" || v === "моющие и дезсредства" || v === "дезсредства и моющие") return "chemicals";
  if (v === "raw" || v === "сырьё" || v === "сырье" || v === "поставщики" || v === "сырьё и поставщики" || v === "сырье и поставщики") return "raw";
  if (v === "equipment" || v === "оборудование") return "equipment";
  if (v === "personnel" || v === "персонал" || v === "сотрудники") return "personnel";
  return raw;
}

function getObjectTypeFilterValues(type: string): string[] {
  const canonical = getCanonicalObjectType(type);
  if (canonical === "chemicals") return ["chemicals", "дезсредства", "моющие", "моющие и дезсредства", "дезсредства и моющие"];
  if (canonical === "raw") return ["raw", "сырьё", "сырье", "поставщики", "сырьё и поставщики", "сырье и поставщики"];
  if (canonical === "equipment") return ["equipment", "оборудование"];
  if (canonical === "personnel") return ["personnel", "персонал", "сотрудники"];
  return [type];
}

function csvEscape(value: string): string {
  const needsQuotes = /[\n\r,\"]/g.test(value);
  const escaped = value.replace(/\"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const userId = Number(user.id);

  const mode = (req.nextUrl.searchParams.get("mode") ?? "").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const type = (req.nextUrl.searchParams.get("type") ?? "").trim();
  const statusFilter = (req.nextUrl.searchParams.get("status") ?? "").trim();
  const documentIdRaw = req.nextUrl.searchParams.get("documentId");
  const documentIdFilter = documentIdRaw ? Number(documentIdRaw) : null;

  const items = await (prisma as any).registryDocument.findMany({
    where: {
      ...(type ? { objectType: { in: getObjectTypeFilterValues(type) } } : {}),
      ...(documentIdFilter ? { documentId: documentIdFilter } : {}),
      document: {
        ...(q
          ? {
              OR: [{ title: { contains: q, mode: "insensitive" } }],
            }
          : {}),
        OR: [
          { authorId: userId },
          { recipientId: userId },
          { responsibleId: userId },
          { watchers: { some: { userId } } },
          { tasks: { some: { assigneeId: userId } } },
        ],
      },
    },
    include: {
      document: {
        include: {
          author: { select: { name: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const filtered = statusFilter
    ? (items as any[]).filter((i: any) => getExpiryStatus(i.expiresAt) === statusFilter)
    : mode === "package"
      ? (items as any[]).filter((i: any) => {
          const s = getExpiryStatus(i.expiresAt);
          return s === "expired" || s === "expiring";
        })
      : items;

  const header = [
    "documentId",
    "title",
    "objectType",
    "zone",
    "supplier",
    "expiresAt",
    "expiryStatus",
    "author",
  ].join(",");

  const rows = (filtered as any[]).map((item: any) => {
    const expiresAt = item.expiresAt ? item.expiresAt.toISOString().slice(0, 10) : "";
    const expiryStatus = getExpiryStatus(item.expiresAt);

    return [
      String(item.documentId),
      csvEscape(item.document.title ?? ""),
      csvEscape(item.objectType ?? ""),
      csvEscape(item.zone ?? ""),
      csvEscape(item.supplier ?? ""),
      expiresAt,
      expiryStatus,
      csvEscape(item.document.author?.name ?? ""),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  const filename = `registry-package-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${filename}\"`,
      "Cache-Control": "no-store",
    },
  });
}
