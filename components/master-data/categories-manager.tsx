"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, FileCheck, Droplet, Heart, Truck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: number;
  name: string;
  type: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  active: boolean;
  _count?: {
    items: number;
  };
}

interface Item {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  metadata: any;
  documentId: number | null;
  expiresAt: string | null;
  supplier: string | null;
  active: boolean;
  category: {
    id: number;
    name: string;
    type: string;
    color: string | null;
    icon: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

const ICON_MAP: Record<string, any> = {
  FileCheck,
  Droplet,
  Heart,
  Truck,
  Package,
};

function getExpiryStatus(expiresAt: string | null): "active" | "expiring" | "expired" | "no_expiry" {
  if (!expiresAt) return "no_expiry";
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "active";
}

const STATUS_META: Record<ReturnType<typeof getExpiryStatus>, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Действует", variant: "default" },
  expiring: { label: "≤ 30 дней", variant: "secondary" },
  expired: { label: "Просрочен", variant: "destructive" },
  no_expiry: { label: "Без срока", variant: "secondary" },
};

export function CategoriesManager({ currentUserRole }: { currentUserRole: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const canEdit = currentUserRole === "director" || currentUserRole === "head" || currentUserRole === "technologist";

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchItems(selectedCategory);
    }
  }, [selectedCategory]);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/master-data/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchItems(categoryId: number) {
    try {
      const res = await fetch(`/api/master-data/items?categoryId=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }

  if (loading) {
    return <div className="text-slate-400">Загрузка...</div>;
  }

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Категории справочников</h2>
          <p className="text-sm text-slate-400">Управление категориями для сертификатов и других справочных данных</p>
        </div>
        {canEdit && (
          <Button className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700">
            <Plus className="mr-2 h-4 w-4" />
            Добавить категорию
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {categories.map((category) => {
          const Icon = category.icon ? ICON_MAP[category.icon] : Package;
          const isSelected = selectedCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`rounded-xl border p-4 text-left transition-all hover:border-slate-700 hover:bg-slate-900/50 ${
                isSelected ? "border-emerald-500/50 bg-slate-900/50" : "border-slate-800 bg-slate-950/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div
                      className="rounded-lg p-2"
                      style={{ backgroundColor: category.color ? `${category.color}20` : "#1e293b" }}
                    >
                      <Icon className="h-5 w-5" style={{ color: category.color || "#94a3b8" }} />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-white">{category.name}</div>
                    <div className="text-xs text-slate-400">{category._count?.items || 0} элементов</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCat && (
        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">{selectedCat.name}</CardTitle>
              {canEdit && (
                <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить элемент
                </Button>
              )}
            </div>
            {selectedCat.description && (
              <p className="text-sm text-slate-400">{selectedCat.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                Нет элементов в этой категории
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const status = getExpiryStatus(item.expiresAt);
                  const statusMeta = STATUS_META[status];

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/30 p-4 transition-colors hover:bg-slate-900/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{item.name}</h3>
                            {item.expiresAt && (
                              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                            )}
                            {!item.active && (
                              <Badge variant="secondary">Неактивен</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                            {item.supplier && (
                              <span>Поставщик: {item.supplier}</span>
                            )}
                            {item.expiresAt && (
                              <span>Срок действия: {new Date(item.expiresAt).toLocaleDateString("ru-RU")}</span>
                            )}
                            {item.metadata && Object.keys(item.metadata).length > 0 && (
                              <span>Доп. данные: {Object.keys(item.metadata).length} полей</span>
                            )}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-400">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
