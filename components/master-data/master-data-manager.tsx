"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { isReadOnlyRole } from "@/lib/roles";
import { CategoriesManager } from "@/components/master-data/categories-manager";

type EmployeeItem = {
  id: number;
  name: string;
  position: string | null;
  active: boolean;
};

type LocationItem = {
  id: number;
  name: string;
};

type EquipmentItem = {
  id: number;
  name: string;
  locationId: number;
  locationName: string;
  type: string;
  targetTemp: number;
  tolerance: number;
};

export function MasterDataManager({
  employees,
  locations,
  equipment,
  currentUserRole,
}: {
  employees: EmployeeItem[];
  locations: LocationItem[];
  equipment: EquipmentItem[];
  currentUserRole?: string;
}) {
  const readOnly = isReadOnlyRole(currentUserRole);
  const [section, setSection] = useState<"employees" | "locations" | "equipment" | "categories">("employees");

  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => (e.name + " " + (e.position ?? "")).toLowerCase().includes(q));
  }, [employees, search]);

  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeBusy, setEmployeeBusy] = useState(false);

  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);

  const [isAddEquipmentOpen, setIsAddEquipmentOpen] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [newEquipmentLocationId, setNewEquipmentLocationId] = useState("");
  const [newEquipmentType, setNewEquipmentType] = useState("fridge");
  const [newEquipmentTargetTemp, setNewEquipmentTargetTemp] = useState("");
  const [newEquipmentTolerance, setNewEquipmentTolerance] = useState("");
  const [equipmentError, setEquipmentError] = useState<string | null>(null);
  const [equipmentBusy, setEquipmentBusy] = useState(false);

  const openEditEmployee = (e: EmployeeItem) => {
    setEditingEmployeeId(e.id);
    setEditName(e.name);
    setEditPosition(e.position ?? "");
    setEditActive(e.active);
    setEditError(null);
  };

  const handleAddEmployee = async () => {
    const name = newEmployeeName.trim();
    const position = newEmployeePosition.trim();
    if (!name) {
      setEmployeeError("Укажите ФИО сотрудника");
      return;
    }

    setEmployeeBusy(true);
    setEmployeeError(null);

    try {
      const res = await fetch("/api/journals/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, position }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить сотрудника");
      }

      setIsAddEmployeeOpen(false);
      setNewEmployeeName("");
      setNewEmployeePosition("");
      window.location.reload();
    } catch (err) {
      setEmployeeError(err instanceof Error ? err.message : "Ошибка добавления сотрудника");
    } finally {
      setEmployeeBusy(false);
    }
  };

  const handleSaveEmployee = async () => {
    if (!editingEmployeeId) return;

    const name = editName.trim();
    const position = editPosition.trim();
    if (!name) {
      setEditError("Укажите ФИО сотрудника");
      return;
    }

    setEditBusy(true);
    setEditError(null);

    try {
      const res = await fetch("/api/journals/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingEmployeeId, name, position, active: editActive }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось сохранить сотрудника");
      }

      window.location.reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка сохранения сотрудника");
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!editingEmployeeId) return;

    setDeleteBusy(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/journals/employees?id=${editingEmployeeId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось удалить сотрудника");
      }

      window.location.reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Ошибка удаления сотрудника");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleAddLocation = async () => {
    const name = newLocationName.trim();
    if (!name) {
      setLocationError("Укажите название помещения");
      return;
    }

    setLocationBusy(true);
    setLocationError(null);

    try {
      const res = await fetch("/api/journals/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить помещение");
      }

      setIsAddLocationOpen(false);
      setNewLocationName("");
      window.location.reload();
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : "Ошибка добавления помещения");
    } finally {
      setLocationBusy(false);
    }
  };

  const handleAddEquipment = async () => {
    const name = newEquipmentName.trim();
    if (!name) {
      setEquipmentError("Укажите название оборудования");
      return;
    }

    const locationId = Number(newEquipmentLocationId);
    if (!locationId || Number.isNaN(locationId)) {
      setEquipmentError("Выберите помещение");
      return;
    }

    const targetTemp = Number(newEquipmentTargetTemp.replace(",", "."));
    const tolerance = Number(newEquipmentTolerance.replace(",", "."));

    if (!Number.isFinite(targetTemp) || !Number.isFinite(tolerance)) {
      setEquipmentError("Укажите корректные числовые значения нормы и допуска");
      return;
    }

    setEquipmentBusy(true);
    setEquipmentError(null);

    try {
      const res = await fetch("/api/journals/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, locationId, targetTemp, tolerance, type: newEquipmentType }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Не удалось добавить оборудование");
      }

      setIsAddEquipmentOpen(false);
      setNewEquipmentName("");
      setNewEquipmentLocationId("");
      setNewEquipmentTargetTemp("");
      setNewEquipmentTolerance("");
      setNewEquipmentType("fridge");
      window.location.reload();
    } catch (err) {
      setEquipmentError(err instanceof Error ? err.message : "Ошибка добавления оборудования");
    } finally {
      setEquipmentBusy(false);
    }
  };

  const equipmentByLocation = useMemo(() => {
    const map = new Map<number, EquipmentItem[]>();
    for (const e of equipment) {
      map.set(e.locationId, [...(map.get(e.locationId) ?? []), e]);
    }
    return map;
  }, [equipment]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={section === "employees" ? "default" : "outline"}
          onClick={() => setSection("employees")}
          className={section === "employees" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
        >
          Сотрудники
        </Button>
        <Button
          type="button"
          variant={section === "locations" ? "default" : "outline"}
          onClick={() => setSection("locations")}
          className={section === "locations" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
        >
          Помещения
        </Button>
        <Button
          type="button"
          variant={section === "equipment" ? "default" : "outline"}
          onClick={() => setSection("equipment")}
          className={section === "equipment" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
        >
          Оборудование
        </Button>
        <Button
          type="button"
          variant={section === "categories" ? "default" : "outline"}
          onClick={() => setSection("categories")}
          className={section === "categories" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 text-white hover:bg-slate-800"}
        >
          Категории
        </Button>
      </div>

      <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-white">Справочники</CardTitle>
          <CardDescription className="text-slate-400">Управляйте базовыми сущностями для журналов и проверок.</CardDescription>
        </CardHeader>
        <CardContent>
          {section === "employees" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск сотрудников"
                  className="h-10 max-w-md rounded-lg border-slate-700 bg-slate-950 text-white placeholder:text-slate-500"
                />
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-600/60 bg-emerald-600/10 text-emerald-100 hover:bg-emerald-600/20"
                    onClick={() => {
                      setIsAddEmployeeOpen((p) => !p);
                      setEmployeeError(null);
                    }}
                  >
                    {isAddEmployeeOpen ? "Скрыть" : "Добавить сотрудника"}
                  </Button>
                )}
              </div>

              {!readOnly && isAddEmployeeOpen && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      placeholder="ФИО"
                      className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                    />
                    <Input
                      value={newEmployeePosition}
                      onChange={(e) => setNewEmployeePosition(e.target.value)}
                      placeholder="Должность (необязательно)"
                      className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                    />
                  </div>
                  {employeeError && <p className="mt-2 text-xs text-red-400">{employeeError}</p>}
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddEmployee}
                      disabled={employeeBusy}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {employeeBusy ? "Сохраняем..." : "Добавить"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {filteredEmployees.map((e) => (
                  <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-white">{e.name}</div>
                          {!e.active && <Badge variant="secondary">Заблокирован</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-slate-400">{e.position ?? "—"}</div>
                      </div>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-slate-700 text-white hover:bg-slate-800"
                          onClick={() => openEditEmployee(e)}
                        >
                          Редактировать
                        </Button>
                      )}
                    </div>

                    {!readOnly && editingEmployeeId === e.id && (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            value={editName}
                            onChange={(ev) => setEditName(ev.target.value)}
                            placeholder="ФИО"
                            className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                          />
                          <Input
                            value={editPosition}
                            onChange={(ev) => setEditPosition(ev.target.value)}
                            placeholder="Должность"
                            className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className={editActive ? "border-emerald-500/70 bg-emerald-500/20 text-emerald-100" : "border-slate-600 bg-slate-900/80 text-slate-200"}
                            onClick={() => setEditActive(true)}
                          >
                            Активен
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className={!editActive ? "border-red-500/70 bg-red-500/20 text-red-100" : "border-slate-600 bg-slate-900/80 text-slate-200"}
                            onClick={() => setEditActive(false)}
                          >
                            Заблокирован
                          </Button>
                        </div>

                        {editError && <p className="mt-2 text-xs text-red-400">{editError}</p>}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="destructive"
                            className="bg-red-500/80 text-white"
                            onClick={handleDeleteEmployee}
                            disabled={deleteBusy || editBusy}
                          >
                            {deleteBusy ? "Удаляем..." : "Удалить"}
                          </Button>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-slate-700 text-white hover:bg-slate-800"
                              onClick={() => {
                                setEditingEmployeeId(null);
                                setEditError(null);
                              }}
                              disabled={deleteBusy || editBusy}
                            >
                              Закрыть
                            </Button>
                            <Button
                              type="button"
                              onClick={handleSaveEmployee}
                              disabled={editBusy || deleteBusy}
                              className="bg-emerald-600 text-white hover:bg-emerald-500"
                            >
                              {editBusy ? "Сохраняем..." : "Сохранить"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {filteredEmployees.length === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-6 text-sm text-slate-400">
                    Сотрудники не найдены.
                  </div>
                )}
              </div>
            </div>
          )}

          {section === "locations" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-400">Всего помещений: {locations.length}</div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-600/60 bg-emerald-600/10 text-emerald-100 hover:bg-emerald-600/20"
                    onClick={() => {
                      setIsAddLocationOpen((p) => !p);
                      setLocationError(null);
                    }}
                  >
                    {isAddLocationOpen ? "Скрыть" : "Добавить помещение"}
                  </Button>
                )}
              </div>

              {!readOnly && isAddLocationOpen && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <Input
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="Название помещения"
                    className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                  />
                  {locationError && <p className="mt-2 text-xs text-red-400">{locationError}</p>}
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddLocation}
                      disabled={locationBusy}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {locationBusy ? "Сохраняем..." : "Добавить"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {locations.map((loc) => (
                  <div key={loc.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 text-white">
                    {loc.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "equipment" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-400">Всего единиц оборудования: {equipment.length}</div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-emerald-600/60 bg-emerald-600/10 text-emerald-100 hover:bg-emerald-600/20"
                    onClick={() => {
                      setIsAddEquipmentOpen((p) => !p);
                      setEquipmentError(null);
                    }}
                  >
                    {isAddEquipmentOpen ? "Скрыть" : "Добавить оборудование"}
                  </Button>
                )}
              </div>

              {!readOnly && isAddEquipmentOpen && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                      placeholder="Название оборудования"
                      className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                    />
                    <select
                      value={newEquipmentLocationId}
                      onChange={(e) => setNewEquipmentLocationId(e.target.value)}
                      className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                    >
                      <option value="">Выберите помещение</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={newEquipmentType}
                      onChange={(e) => setNewEquipmentType(e.target.value)}
                      className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100"
                    >
                      <option value="fridge">Холодильник</option>
                      <option value="freezer">Морозилка</option>
                      <option value="showcase">Витрина</option>
                      <option value="camera">Камера</option>
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={newEquipmentTargetTemp}
                        onChange={(e) => setNewEquipmentTargetTemp(e.target.value)}
                        placeholder="Норма, °C"
                        inputMode="decimal"
                        className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                      />
                      <Input
                        value={newEquipmentTolerance}
                        onChange={(e) => setNewEquipmentTolerance(e.target.value)}
                        placeholder="Допуск, °C"
                        inputMode="decimal"
                        className="h-10 rounded-lg border-slate-700 bg-slate-900 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {equipmentError && <p className="mt-2 text-xs text-red-400">{equipmentError}</p>}

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAddEquipment}
                      disabled={equipmentBusy}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
                    >
                      {equipmentBusy ? "Сохраняем..." : "Добавить"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {locations.map((loc) => {
                  const items = equipmentByLocation.get(loc.id) ?? [];
                  return (
                    <div key={loc.id} className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white">{loc.name}</div>
                        <div className="text-xs text-slate-400">{items.length} шт.</div>
                      </div>
                      {items.length === 0 ? (
                        <div className="mt-2 text-sm text-slate-400">—</div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {items.map((eq) => (
                            <div key={eq.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-medium text-white">{eq.name}</div>
                                <div className="text-xs text-slate-300">
                                  {eq.targetTemp}±{eq.tolerance} °C
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">Тип: {eq.type}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {section === "categories" && (
            <CategoriesManager currentUserRole={currentUserRole || "employee"} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
