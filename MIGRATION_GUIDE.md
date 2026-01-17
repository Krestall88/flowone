# Руководство по миграции БД для новых HACCP модулей

## Шаг 1: Применить миграцию Prisma

После обновления `schema.prisma` необходимо создать и применить миграцию:

```bash
# Создать миграцию
npx prisma migrate dev --name add_haccp_modules

# Или если база уже существует, можно использовать push (быстрее для разработки)
npx prisma db push

# Сгенерировать Prisma Client
npx prisma generate
```

## Шаг 2: Проверить миграцию

После применения миграции должны появиться новые таблицы:
- `CCP` - Критические контрольные точки
- `CCPAction` - Действия по CCP
- `LabTest` - Лабораторные исследования
- `Notification` - Уведомления

## Шаг 3: Перезапустить dev сервер

```bash
npm run dev
```

## Что добавлено

### Новые модели в Prisma:

1. **CCP (Critical Control Point)**
   - Процесс, опасность, уровень риска
   - Меры контроля, корректирующие действия
   - Связи с документами и несоответствиями

2. **CCPAction**
   - История действий по CCP
   - Типы: check, corrective, review

3. **LabTest**
   - Лабораторные исследования
   - Связь с реестром и несоответствиями
   - Автоматическое создание несоответствий при отклонениях

4. **Notification**
   - Уведомления для пользователей
   - Типы: critical_deviation, reminder, info
   - Приоритеты: low, medium, high

### API Routes созданы:

- `GET/POST /api/ccp` - Список и создание CCP
- `GET/PUT/DELETE /api/ccp/[id]` - Детали, обновление, удаление CCP
- `POST /api/ccp/[id]/actions` - Добавление действий по CCP

## Следующие шаги

После применения миграции TypeScript ошибки исчезнут, и можно будет продолжить разработку:
- API routes для LabTest
- API routes для Notification
- Frontend компоненты (HACCP Plan, Lab Journal, Notification Center)
- Dashboard с метриками рисков
- PWA и оффлайн-режим
