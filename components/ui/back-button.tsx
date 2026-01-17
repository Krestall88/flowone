"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
}

export function BackButton({ fallbackHref = "/dashboard", label = "Назад" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Проверяем, есть ли история навигации
    if (window.history.length > 1) {
      router.back();
    } else {
      // Если истории нет, переходим на fallback
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant="ghost"
      size="sm"
      className="mb-6 text-slate-400 hover:text-white"
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
