import { BadgeProps } from "@/components/ui/badge";

export type DocumentStatus =
  | "draft"
  | "in_progress"
  | "approved"
  | "rejected"
  | "in_execution"
  | "executed";

export const STATUS_MAP: Record<
  DocumentStatus,
  { label: string; badgeVariant: BadgeProps["variant"] }
> = {
  draft: {
    label: "Черновик",
    badgeVariant: "secondary",
  },
  in_progress: {
    label: "На согласовании",
    badgeVariant: "warning",
  },
  approved: {
    label: "Согласован",
    badgeVariant: "success",
  },
  rejected: {
    label: "Отклонён",
    badgeVariant: "destructive",
  },
  in_execution: {
    label: "На исполнении",
    badgeVariant: "warning",
  },
  executed: {
    label: "Исполнен",
    badgeVariant: "success",
  },
};

export function getStatusMeta(status: string | null | undefined) {
  if (!status) {
    return { label: "Неизвестно", badgeVariant: "secondary" as BadgeProps["variant"] };
  }
  return STATUS_MAP[status as DocumentStatus] ?? {
    label: status,
    badgeVariant: "secondary" as BadgeProps["variant"],
  };
}

export function getDocumentStatusLabel(status: string) {
  const meta = getStatusMeta(status);
  return {
    label: meta.label,
    variant: meta.badgeVariant,
  };
}
