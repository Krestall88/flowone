"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, FileText, AlertCircle } from "lucide-react";

interface CCP {
  id: number;
  process: string;
  hazard: string;
  riskLevel: string;
  controlMeasures: string;
  correctiveActions: string;
  criticalLimits?: string;
  responsiblePerson?: string;
  status: string;
  createdAt: string;
  relatedDocument?: { id: number; title: string };
  relatedNonconformity?: { id: number; title: string };
  actions?: Array<{
    id: number;
    actionType: string;
    description: string;
    takenAt: string;
  }>;
}

interface CCPTableProps {
  ccps: CCP[];
  onRefresh?: () => void;
}

const RISK_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive"; icon: any }> = {
  low: { label: "Низкий", variant: "default", icon: CheckCircle2 },
  medium: { label: "Средний", variant: "secondary", icon: Clock },
  high: { label: "Высокий", variant: "destructive", icon: AlertTriangle },
};

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Активен", variant: "default" },
  resolved: { label: "Решён", variant: "secondary" },
  archived: { label: "Архив", variant: "secondary" },
};

export function CCPTable({ ccps, onRefresh }: CCPTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (ccps.length === 0) {
    return (
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-slate-400">Критические контрольные точки не найдены</p>
          <p className="mt-2 text-sm text-slate-500">Создайте первую CCP для начала работы</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ccps.map((ccp) => {
        const riskMeta = RISK_META[ccp.riskLevel] || RISK_META.medium;
        const statusMeta = STATUS_META[ccp.status] || STATUS_META.active;
        const RiskIcon = riskMeta.icon;
        const isExpanded = expandedId === ccp.id;

        return (
          <Card key={ccp.id} className="border-slate-800 bg-slate-900/50 hover:bg-slate-900/70 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <RiskIcon className={`h-5 w-5 ${
                      ccp.riskLevel === "high" ? "text-red-400" :
                      ccp.riskLevel === "medium" ? "text-yellow-400" :
                      "text-green-400"
                    }`} />
                    <h3 className="text-lg font-semibold text-white">{ccp.process}</h3>
                    <Badge variant={riskMeta.variant}>{riskMeta.label}</Badge>
                    <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-slate-400">Опасность:</span>
                      <p className="mt-1 text-slate-300">{ccp.hazard}</p>
                    </div>

                    {isExpanded && (
                      <>
                        <div>
                          <span className="font-medium text-slate-400">Меры контроля:</span>
                          <p className="mt-1 text-slate-300">{ccp.controlMeasures}</p>
                        </div>

                        <div>
                          <span className="font-medium text-slate-400">Корректирующие действия:</span>
                          <p className="mt-1 text-slate-300">{ccp.correctiveActions}</p>
                        </div>

                        {ccp.criticalLimits && (
                          <div>
                            <span className="font-medium text-slate-400">Критические лимиты:</span>
                            <p className="mt-1 text-slate-300">{ccp.criticalLimits}</p>
                          </div>
                        )}

                        {ccp.responsiblePerson && (
                          <div>
                            <span className="font-medium text-slate-400">Ответственный:</span>
                            <p className="mt-1 text-slate-300">{ccp.responsiblePerson}</p>
                          </div>
                        )}

                        {ccp.relatedDocument && (
                          <div>
                            <span className="font-medium text-slate-400">Связанный документ:</span>
                            <Link
                              href={`/documents/${ccp.relatedDocument.id}`}
                              className="mt-1 flex items-center gap-2 text-emerald-400 hover:underline"
                            >
                              <FileText className="h-4 w-4" />
                              {ccp.relatedDocument.title}
                            </Link>
                          </div>
                        )}

                        {ccp.relatedNonconformity && (
                          <div>
                            <span className="font-medium text-slate-400">Связанное несоответствие:</span>
                            <Link
                              href={`/nonconformities`}
                              className="mt-1 flex items-center gap-2 text-red-400 hover:underline"
                            >
                              <AlertTriangle className="h-4 w-4" />
                              {ccp.relatedNonconformity.title}
                            </Link>
                          </div>
                        )}

                        {ccp.actions && ccp.actions.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-400">Последние действия:</span>
                            <div className="mt-2 space-y-2">
                              {ccp.actions.slice(0, 3).map((action) => (
                                <div key={action.id} className="rounded-lg bg-slate-800/50 p-3">
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Badge variant="secondary" className="text-xs">
                                      {action.actionType === "check" ? "Проверка" :
                                       action.actionType === "corrective" ? "Корректирующее" :
                                       "Пересмотр"}
                                    </Badge>
                                    <span>{new Date(action.takenAt).toLocaleString("ru-RU")}</span>
                                  </div>
                                  <p className="mt-1 text-sm text-slate-300">{action.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setExpandedId(isExpanded ? null : ccp.id)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    {isExpanded ? "Свернуть" : "Подробнее"}
                  </Button>
                  <Link href={`/haccp-plan/${ccp.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                    >
                      Редактировать
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
