import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getActionMeta } from "@/lib/workflow";

interface ProgressTask {
  step: number;
  status: string;
  action: string;
  assignee?: {
    name: string | null;
    role?: string | null;
  } | null;
}

interface ProgressTrackerProps {
  tasks: ProgressTask[];
  status: string;
}

export function ProgressTracker({ tasks, status }: ProgressTrackerProps) {
  const sortedTasks = [...tasks].sort((a, b) => a.step - b.step);
  const totalSteps = sortedTasks.length;
  const activeTask = sortedTasks.find((task) => task.status === "pending");
  const activeStep = activeTask?.step ?? totalSteps;
  const isCompleted = status === "approved";
  const isRejected = status === "rejected";

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {sortedTasks.map((task, index) => {
          const isActive = task.step === activeStep && !isCompleted && !isRejected;
          const isPast = task.step < activeStep || isCompleted;
          const isFailed = isRejected && task.step === activeStep;
          const actionMeta = getActionMeta(task.action as any);

          return (
            <div key={task.step} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-all",
                    isPast && !isFailed && "border-green-500 bg-green-500 text-white",
                    isActive && !isFailed && "border-primary bg-primary text-white",
                    isFailed && "border-destructive bg-destructive text-white",
                    !isPast && !isActive && "border-slate-300 bg-white text-slate-400",
                  )}
                >
                  {isPast && !isFailed ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm">{task.step}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium",
                      (isPast || isActive) && !isFailed && "text-slate-900",
                      isFailed && "text-destructive",
                      !isPast && !isActive && "text-slate-400",
                    )}
                  >
                    {actionMeta.label}
                  </p>
                  <p className="text-xs text-slate-500">
                    {task.assignee?.name ?? "Без назначенного"}
                  </p>
                </div>
              </div>

              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1 transition-all",
                    isPast && !isFailed ? "bg-green-500" : "bg-slate-200",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
