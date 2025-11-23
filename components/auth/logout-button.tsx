"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { useTransition } from "react";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(async () => {
      await signOut({ callbackUrl: "/login" });
    });
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start gap-2 text-sm text-muted-foreground hover:text-foreground"
      onClick={handleClick}
      disabled={isPending}
    >
      <LogOut className="h-4 w-4" />
      Выйти
    </Button>
  );
}
