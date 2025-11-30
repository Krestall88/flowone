"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Введите корректный email"),
  password: z.string().min(4, "Минимум 4 символа"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm({ className, callbackUrl = "/workflow" }: { className?: string; callbackUrl?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const [serverError, setServerError] = useState<string | null>(
    callbackError === "CredentialsSignin" ? "Неверный email или пароль" : null,
  );
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ email: string; password: string }>;
      if (!customEvent.detail) return;
      form.setValue("email", customEvent.detail.email, { shouldValidate: true, shouldDirty: true });
      form.setValue("password", customEvent.detail.password, { shouldValidate: true, shouldDirty: true });
      setServerError(null);
    };

    window.addEventListener("flowone:set-demo-credentials", handler as EventListener);
    return () => window.removeEventListener("flowone:set-demo-credentials", handler as EventListener);
  }, [form]);

  const onSubmit = (values: FormValues) => {
    setServerError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await signIn("credentials", {
        ...values,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setServerError("Неверный email или пароль");
        return;
      }

      setSuccess(true);
      router.push(result?.url ?? callbackUrl);
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className={cn("space-y-6", className)}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Рабочая почта</Label>
          <Input
            id="email"
            type="email"
            placeholder="employee@example.com"
            autoComplete="email"
            disabled={isPending}
            {...form.register("email")}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Пароль</Label>
            <span className="text-xs text-muted-foreground">По умолчанию: password</span>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isPending}
            {...form.register("password")}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {serverError}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-600">
          Успешный вход, перенаправляем…
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full h-12 text-base">
        {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
        Войти в систему
      </Button>
    </form>
  );
}
