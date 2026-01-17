"use client"

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TemperatureDataPoint {
  date: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  targetMin: number;
  targetMax: number;
}

interface TemperatureChartProps {
  data7: TemperatureDataPoint[];
  data14: TemperatureDataPoint[];
  data30: TemperatureDataPoint[];
}

export function TemperatureChart({ data7, data14, data30 }: TemperatureChartProps) {
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  
  const data = period === 7 ? data7 : period === 14 ? data14 : data30;
  
  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-slate-200">График температур</CardTitle>
              <CardDescription className="text-sm text-slate-400">За последние {period} дней</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={period === 7 ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(7)}
                className={period === 7 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300"}
              >
                7 дней
              </Button>
              <Button
                variant={period === 14 ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(14)}
                className={period === 14 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300"}
              >
                14 дней
              </Button>
              <Button
                variant={period === 30 ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(30)}
                className={period === 30 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300"}
              >
                30 дней
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-slate-500">
            Нет данных для отображения
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-200">График температур</CardTitle>
            <CardDescription className="text-sm text-slate-400">
              За последние {period} дней • Средние значения по всему оборудованию
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={period === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(7)}
              className={period === 7 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
            >
              7 дней
            </Button>
            <Button
              variant={period === 14 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(14)}
              className={period === 14 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
            >
              14 дней
            </Button>
            <Button
              variant={period === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(30)}
              className={period === 30 ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-slate-300 hover:bg-slate-800"}
            >
              30 дней
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94a3b8"
              style={{ fontSize: '12px' }}
              label={{ value: '°C', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#e2e8f0'
              }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            />
            
            {/* Зоны допуска */}
            <ReferenceLine 
              y={data[0]?.targetMax} 
              stroke="#ef4444" 
              strokeDasharray="3 3" 
              label={{ value: 'Макс', fill: '#ef4444', fontSize: 10 }}
            />
            <ReferenceLine 
              y={data[0]?.targetMin} 
              stroke="#3b82f6" 
              strokeDasharray="3 3"
              label={{ value: 'Мин', fill: '#3b82f6', fontSize: 10 }}
            />
            
            {/* Линии температур */}
            <Line 
              type="monotone" 
              dataKey="maxTemp" 
              stroke="#f87171" 
              strokeWidth={2}
              name="Максимум"
              dot={{ fill: '#f87171', r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="avgTemp" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Среднее"
              dot={{ fill: '#10b981', r: 5 }}
            />
            <Line 
              type="monotone" 
              dataKey="minTemp" 
              stroke="#60a5fa" 
              strokeWidth={2}
              name="Минимум"
              dot={{ fill: '#60a5fa', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
