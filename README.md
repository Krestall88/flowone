# Система документооборота FlowOne

Полнофункциональная система управления документами с многоэтапным согласованием и интеграцией с Telegram.

## Технологии

- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma ORM** с PostgreSQL (Supabase)
- **NextAuth.js** для аутентификации
- **shadcn/ui** + Tailwind CSS
- **Telegram Bot API** для уведомлений

## Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Скопируйте `.env.example` в `.env` и заполните переменные:

```bash
cp .env.example .env
```

Подробные инструкции по настройке см. в [docs/env-setup.md](./docs/env-setup.md)

### 3. Настройка базы данных

```bash
# Применить схему к базе данных
npx prisma db push

# Сгенерировать Prisma Client
npx prisma generate

# Заполнить тестовыми данными
npm run db:seed
```

### 4. Запуск dev-сервера

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000)

## Тестовые пользователи

После выполнения `npm run db:seed` доступны следующие пользователи:

| Email | Пароль | Роль |
|-------|--------|------|
| director@example.com | password123 | Директор |
| accountant@example.com | password123 | Главный бухгалтер |
| head@example.com | password123 | Руководитель |
| employee1@example.com | password123 | Снабженец |
| employee2@example.com | password123 | Снабженец |

## Основные возможности

- ✅ Аутентификация с NextAuth.js
- ✅ Дашборд с фильтрацией документов
- ✅ Создание служебных записок с вложениями
- ✅ 4-этапный workflow согласования
- ✅ Telegram уведомления для исполнителей
- ✅ Детальная страница документа с прогресс-баром
- ✅ Согласование/отклонение с комментариями
- ✅ Адаптивный UI с темной темой

## Структура проекта

```
flowone/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── dashboard/            # Дашборд
│   ├── documents/            # Страницы документов
│   └── login/                # Страница входа
├── components/               # React компоненты
│   ├── ui/                   # shadcn/ui компоненты
│   ├── auth/                 # Компоненты аутентификации
│   ├── dashboard/            # Компоненты дашборда
│   └── documents/            # Компоненты документов
├── lib/                      # Утилиты и хелперы
│   ├── prisma.ts             # Prisma client
│   ├── auth.ts               # NextAuth config
│   ├── workflow.ts           # Логика workflow
│   ├── telegram.ts           # Telegram интеграция
│   └── supabase.ts           # Supabase helpers
├── prisma/
│   ├── schema.prisma         # Схема БД
│   └── seed.ts               # Seed скрипт
└── docs/                     # Документация
    └── env-setup.md          # Инструкции по настройке
```

## Команды

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Запуск production
npm start

# База данных
npx prisma db push        # Применить схему
npx prisma generate       # Сгенерировать client
npm run db:seed           # Заполнить тестовыми данными
npx prisma studio         # Открыть Prisma Studio

# Линтинг
npm run lint
```

## Дополнительная информация

- Подробная настройка окружения: [docs/env-setup.md](./docs/env-setup.md)
- Prisma документация: [https://www.prisma.io/docs](https://www.prisma.io/docs)
- Next.js документация: [https://nextjs.org/docs](https://nextjs.org/docs)
