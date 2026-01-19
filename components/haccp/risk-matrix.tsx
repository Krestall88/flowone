"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface RiskMatrixProps {
  ccps: Array<{
    id: number;
    process: string;
    severity: number;
    probability: number;
    riskLevel: string;
  }>;
}

export function RiskMatrix({ ccps }: RiskMatrixProps) {
  // Создаем матрицу 5x5
  const matrix: Array<Array<typeof ccps>> = Array(5).fill(null).map(() => Array(5).fill(null).map(() => []));
  
  // Распределяем CCP по ячейкам матрицы
  ccps.forEach((ccp) => {
    const row = 5 - ccp.probability; // Инвертируем, чтобы высокая вероятность была вверху
    const col = ccp.severity - 1;
    if (row >= 0 && row < 5 && col >= 0 && col < 5) {
      matrix[row][col].push(ccp);
    }
  });

  // Определяем цвет ячейки на основе риска (severity * probability)
  const getCellColor = (severity: number, probability: number) => {
    const score = severity * probability;
    if (score >= 15) return "bg-red-500/20 border-red-500/40";
    if (score >= 10) return "bg-yellow-500/20 border-yellow-500/40";
    return "bg-green-500/20 border-green-500/40";
  };

  const getCellTextColor = (severity: number, probability: number) => {
    const score = severity * probability;
    if (score >= 15) return "text-red-300";
    if (score >= 10) return "text-yellow-300";
    return "text-green-300";
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Матрица рисков HACCP</CardTitle>
        <CardDescription className="text-slate-400">
          Распределение критических контрольных точек по уровню риска (Тяжесть × Вероятность)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Заголовок таблицы */}
            <div className="mb-2 flex items-center gap-2">
              <div className="w-24 text-xs text-slate-400"></div>
              <div className="flex-1 text-center text-xs font-semibold text-slate-300">
                Тяжесть последствий →
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Левая ось (Вероятность) */}
              <div className="flex flex-col justify-between py-2">
                <div className="flex h-full flex-col justify-between">
                  <div className="text-xs text-slate-400">Очень часто (5)</div>
                  <div className="text-xs text-slate-400">Часто (4)</div>
                  <div className="text-xs text-slate-400">Иногда (3)</div>
                  <div className="text-xs text-slate-400">Редко (2)</div>
                  <div className="text-xs text-slate-400">Очень редко (1)</div>
                </div>
                <div className="mt-2 -rotate-90 origin-center text-xs font-semibold text-slate-300 whitespace-nowrap">
                  ← Вероятность
                </div>
              </div>

              {/* Матрица */}
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-1">
                  {matrix.map((row, rowIdx) => (
                    row.map((cell, colIdx) => {
                      const severity = colIdx + 1;
                      const probability = 5 - rowIdx;
                      const score = severity * probability;
                      
                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`relative min-h-[80px] rounded border p-2 transition-all hover:scale-105 ${getCellColor(severity, probability)}`}
                        >
                          <div className={`text-xs font-semibold ${getCellTextColor(severity, probability)}`}>
                            {score}
                          </div>
                          {cell.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {cell.map((ccp) => (
                                <div
                                  key={ccp.id}
                                  className="rounded bg-slate-950/50 px-1.5 py-0.5 text-[10px] text-slate-200 truncate"
                                  title={ccp.process}
                                >
                                  {ccp.process.length > 20 ? `${ccp.process.substring(0, 20)}...` : ccp.process}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ))}
                </div>
                
                {/* Нижняя ось (Тяжесть) */}
                <div className="mt-2 grid grid-cols-5 gap-1 text-center">
                  <div className="text-xs text-slate-400">Незначит. (1)</div>
                  <div className="text-xs text-slate-400">Малая (2)</div>
                  <div className="text-xs text-slate-400">Средняя (3)</div>
                  <div className="text-xs text-slate-400">Серьёзная (4)</div>
                  <div className="text-xs text-slate-400">Катастроф. (5)</div>
                </div>
              </div>
            </div>

            {/* Легенда */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-green-500/40 bg-green-500/20"></div>
                <span className="text-slate-400">Низкий риск (&lt; 10)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-yellow-500/40 bg-yellow-500/20"></div>
                <span className="text-slate-400">Средний риск (10-14)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border border-red-500/40 bg-red-500/20"></div>
                <span className="text-slate-400">Высокий риск (≥ 15)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
