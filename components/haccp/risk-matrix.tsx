"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

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
    if (score >= 15) return "bg-red-600/30 border-2 border-red-500/60";
    if (score >= 10) return "bg-amber-600/30 border-2 border-amber-500/60";
    return "bg-emerald-600/20 border border-emerald-500/40";
  };

  const getCellTextColor = (severity: number, probability: number) => {
    const score = severity * probability;
    if (score >= 15) return "text-red-200";
    if (score >= 10) return "text-amber-200";
    return "text-emerald-200";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 15) return "ВЫСОКИЙ";
    if (score >= 10) return "СРЕДНИЙ";
    return "НИЗКИЙ";
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Матрица оценки рисков HACCP
            </CardTitle>
            <CardDescription className="mt-2 text-slate-400">
              Каждая критическая точка оценивается по двум параметрам: насколько <strong>серьёзны последствия</strong> (по горизонтали) 
              и насколько <strong>часто это может произойти</strong> (по вертикали)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Инструкция */}
            <div className="mb-4 rounded-lg bg-slate-800/50 p-3 text-sm text-slate-300">
              <strong className="text-white">Как читать матрицу:</strong> Чем правее и выше находится точка, тем опаснее риск. 
              Красные зоны требуют немедленного внимания!
            </div>

            {/* Заголовок верхней оси */}
            <div className="mb-3 flex items-center gap-2">
              <div className="w-32"></div>
              <div className="flex-1 text-center">
                <div className="text-sm font-bold text-white">НАСКОЛЬКО СЕРЬЁЗНЫ ПОСЛЕДСТВИЯ? →</div>
                <div className="text-xs text-slate-400 mt-1">(если риск реализуется)</div>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* Левая ось (Вероятность) */}
              <div className="flex w-32 flex-col">
                <div className="mb-2 text-center">
                  <div className="text-sm font-bold text-white">КАК ЧАСТО?</div>
                  <div className="text-xs text-slate-400">(вероятность)</div>
                </div>
                <div className="flex flex-1 flex-col justify-around">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">5</div>
                    <div className="text-[10px] text-slate-400">Очень часто</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">4</div>
                    <div className="text-[10px] text-slate-400">Часто</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">3</div>
                    <div className="text-[10px] text-slate-400">Иногда</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">2</div>
                    <div className="text-[10px] text-slate-400">Редко</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">1</div>
                    <div className="text-[10px] text-slate-400">Очень редко</div>
                  </div>
                </div>
              </div>

              {/* Матрица */}
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-2">
                  {matrix.map((row, rowIdx) => (
                    row.map((cell, colIdx) => {
                      const severity = colIdx + 1;
                      const probability = 5 - rowIdx;
                      const score = severity * probability;
                      const riskLabel = getRiskLabel(score);
                      
                      return (
                        <div
                          key={`${rowIdx}-${colIdx}`}
                          className={`relative min-h-[90px] rounded-lg p-2 transition-all hover:scale-105 ${getCellColor(severity, probability)}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className={`text-[10px] font-bold uppercase ${getCellTextColor(severity, probability)}`}>
                              {riskLabel}
                            </div>
                            <div className={`text-xs font-semibold ${getCellTextColor(severity, probability)}`}>
                              {score}
                            </div>
                          </div>
                          {cell.length > 0 && (
                            <div className="space-y-1">
                              {cell.map((ccp) => (
                                <div
                                  key={ccp.id}
                                  className="rounded bg-slate-950/60 px-1.5 py-1 text-[10px] leading-tight text-slate-100"
                                  title={ccp.process}
                                >
                                  {ccp.process.length > 18 ? `${ccp.process.substring(0, 18)}...` : ccp.process}
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
                <div className="mt-3 grid grid-cols-5 gap-2">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">1</div>
                    <div className="text-[10px] text-slate-400">Незначит.</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">2</div>
                    <div className="text-[10px] text-slate-400">Малая</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">3</div>
                    <div className="text-[10px] text-slate-400">Средняя</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">4</div>
                    <div className="text-[10px] text-slate-400">Серьёзная</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold text-white">5</div>
                    <div className="text-[10px] text-slate-400">Катастроф.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Легенда */}
            <div className="mt-6 rounded-lg bg-slate-800/50 p-4">
              <div className="mb-2 text-sm font-semibold text-white">Уровни риска:</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded border border-emerald-500/60 bg-emerald-600/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-emerald-200">✓</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-200">НИЗКИЙ (1-9)</div>
                    <div className="text-xs text-slate-400">Допустимый риск, стандартный контроль</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded border-2 border-amber-500/60 bg-amber-600/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-amber-200">!</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-amber-200">СРЕДНИЙ (10-14)</div>
                    <div className="text-xs text-slate-400">Требует усиленного контроля</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded border-2 border-red-500/60 bg-red-600/30 flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-red-200" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-200">ВЫСОКИЙ (15-25)</div>
                    <div className="text-xs text-slate-400">Критично! Немедленные меры</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
