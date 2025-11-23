"use client";

import { useCallback } from "react";

interface SampleUser {
  role: string;
  email: string;
  password?: string;
}

interface SampleUsersPanelProps {
  users: SampleUser[];
}

export function SampleUsersPanel({ users }: SampleUsersPanelProps) {
  const handleFill = useCallback((user: SampleUser) => {
    const event = new CustomEvent("flowone:set-demo-credentials", {
      detail: { email: user.email, password: user.password ?? "password" },
    });
    window.dispatchEvent(event);
  }, []);

  return (
    <div className="grid gap-2 text-sm text-white/80 lg:grid-cols-2">
      {users.map((user) => (
        <button
          key={user.email}
          type="button"
          onClick={() => handleFill(user)}
          className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <span>{user.role}</span>
          <span className="font-mono text-xs text-white/70">{user.email}</span>
        </button>
      ))}
    </div>
  );
}
