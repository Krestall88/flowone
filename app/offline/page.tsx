import { WifiOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = 'force-dynamic';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50">
        <CardContent className="py-12 text-center">
          <WifiOff className="mx-auto h-16 w-16 text-slate-600" />
          <h1 className="mt-6 text-2xl font-bold text-white">Нет подключения</h1>
          <p className="mt-3 text-slate-400">
            Вы находитесь в оффлайн-режиме. Некоторые функции могут быть недоступны.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Проверьте подключение к интернету и обновите страницу.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Обновить страницу
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
