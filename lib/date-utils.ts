/**
 * Утилиты для работы с датами журналов.
 * 
 * Проблема: при сохранении даты через parseISO("2025-11-30") результат зависит
 * от часового пояса сервера. Локальный dev (UTC+3) создаёт 2025-11-29T21:00:00Z,
 * а прод (UTC) создаёт 2025-11-30T00:00:00Z. В итоге записи за "один день"
 * оказываются разными в БД.
 * 
 * Решение: всегда нормализовать дату к UTC полночи (00:00:00.000Z).
 */

/**
 * Преобразует строку YYYY-MM-DD в Date с полночью UTC.
 * Например: "2025-11-30" -> 2025-11-30T00:00:00.000Z
 */
export function parseToUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Возвращает сегодняшнюю дату как UTC полночь.
 * Берёт локальный год/месяц/день и создаёт Date.UTC.
 */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
}

/**
 * Форматирует Date в строку YYYY-MM-DD (по UTC компонентам).
 */
export function formatDateISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Возвращает начало и конец дня в UTC для запросов к БД.
 */
export function getDayRangeUTC(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
  const end = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ));
  return { start, end };
}
