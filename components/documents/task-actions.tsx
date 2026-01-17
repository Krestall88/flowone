"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, CornerUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ACTION_CONFIG, TaskAction } from "@/lib/workflow";
import { isReadOnlyRole } from "@/lib/roles";

interface TaskActionsProps {
  taskId: number;
  actionType: TaskAction;
  canSkip?: boolean;
  commentRequired?: boolean;
  currentUserRole?: string;
}

export function TaskActions({ taskId, actionType, canSkip, commentRequired, currentUserRole }: TaskActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");

  const primaryMeta = ACTION_CONFIG[actionType];
  const requireApprovalComment = commentRequired ?? false;
  const readOnly = isReadOnlyRole(currentUserRole);

  const submitDecision = (decision: "complete" | "reject" | "skip", commentText: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            decision,
            comment: commentText || null,
          }),
        });

        if (response.ok) {
          router.refresh();
        } else {
          const data = await response.json();
          alert(data.error || "Ошибка обработки задачи");
        }
      } catch (error) {
        alert("Ошибка сети");
      }
    });
  };

  return (
    <div className="space-y-3">
      {readOnly && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Только просмотр
        </div>
      )}

      {requireApprovalComment && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="approvalComment">Комментарий (обязателен)</Label>
            <span className="text-xs text-slate-500">Для действия "{primaryMeta.label}"</span>
          </div>
          <Textarea
            id="approvalComment"
            placeholder="Опишите принятое решение..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={isPending || readOnly}
          />
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            className="flex-1 min-w-[140px]"
            onClick={() => submitDecision("complete", requireApprovalComment ? comment : "")}
            disabled={isPending || (requireApprovalComment && !comment.trim())}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Check className="mr-2 h-4 w-4" />
            {primaryMeta.primaryButton}
          </Button>

          {canSkip && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 min-w-[140px]"
              onClick={() => submitDecision("skip", comment)}
              disabled={isPending}
            >
              <CornerUpRight className="mr-2 h-4 w-4" />
              Пропустить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
