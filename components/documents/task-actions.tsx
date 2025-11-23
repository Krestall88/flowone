"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2, CornerUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ACTION_CONFIG, TaskAction } from "@/lib/workflow";

interface TaskActionsProps {
  taskId: number;
  actionType: TaskAction;
  canSkip?: boolean;
  commentRequired?: boolean;
}

export function TaskActions({ taskId, actionType, canSkip, commentRequired }: TaskActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [isRejectFlow, setIsRejectFlow] = useState(false);

  const primaryMeta = ACTION_CONFIG[actionType];
  const requireApprovalComment = commentRequired ?? false;

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

  if (isRejectFlow) {
    return (
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="space-y-2">
          <Label htmlFor="comment">Причина отклонения</Label>
          <Textarea
            id="comment"
            placeholder="Укажите причину отклонения документа..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            className="flex-1"
            onClick={() => submitDecision("reject", comment)}
            disabled={isPending || !comment.trim()}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <X className="mr-2 h-4 w-4" />
            Подтвердить отклонение
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIsRejectFlow(false);
              setComment("");
            }}
            disabled={isPending}
          >
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
            disabled={isPending}
          />
        </div>
      )}

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

        <Button
          size="sm"
          variant="destructive"
          className="flex-1 min-w-[140px]"
          onClick={() => setIsRejectFlow(true)}
          disabled={isPending}
        >
          <X className="mr-2 h-4 w-4" />
          Отклонить
        </Button>
      </div>
    </div>
  );
}
