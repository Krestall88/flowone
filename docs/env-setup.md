# Инструкция по заполнению `.env`

Файл `.env` лежит в корне репозитория рядом с `package.json`. Скопируйте `.env.example` в `.env` и заполните значения по шагам ниже.

> **Важно:** после изменения `.env` перезапускайте `npm run dev`, чтобы Next.js увидел новые переменные.

## 1. DATABASE_URL
**Что это:** строка подключения PostgreSQL, которую использует Prisma (Supabase тоже совместим с Postgres).

**Где взять:**
1. Создайте проект в [Supabase](https://supabase.com/) (или используйте собственный PostgreSQL-сервер).
2. В Supabase откройте **Project Settings → Database → Connection string → URI**.
3. Скопируйте строку вида:
   ```
   postgresql://postgres:<PASSWORD>@db.<hash>.supabase.co:5432/postgres
   ```
4. Подставьте реальный пароль (`<PASSWORD>`) и, если нужно, имя БД (`/postgres`).
5. Вставьте строку в `.env`:
   ```
   DATABASE_URL="postgresql://..."
   ```

**Проверка:** выполните `npx prisma db push` — если подключение корректное, миграция отработает.

## 2. NEXTAUTH_SECRET
**Что это:** криптографический секрет, который использует NextAuth для подписи JWT и сессий.

**Как сгенерировать:**
- В PowerShell/WSL выполните:
  ```bash
  openssl rand -base64 32
  ```
- Скопируйте результат и вставьте в `.env`:
  ```
  NEXTAUTH_SECRET="<сгенерированная_строка>"
  ```

## 3. NEXTAUTH_URL
**Что это:** базовый URL приложения, который NextAuth использует для callback-ов.

**Значения:**
- Для локальной разработки: `http://localhost:3000`
- Для продакшена на Vercel: `https://<ваш-домен>.vercel.app`

Пример:
```
NEXTAUTH_URL="http://localhost:3000"
```

## 4. TELEGRAM_BOT_TOKEN
**Что это:** токен вашего Telegram-бота для уведомления согласующих.

**Как получить:**
1. В Telegram найдите @BotFather.
2. Команда `/newbot` → введите название и username → получите токен вида `1234567890:ABC...`.
3. Вставьте в `.env`:
   ```
   TELEGRAM_BOT_TOKEN="1234567890:ABC..."
   ```

## 5. TELEGRAM_BOT_SECRET
**Что это:** дополнительная «shared secret» строка, чтобы проверять, что webhook пришёл от вашего бота.

**Как задать:**
1. Придумайте случайную строку (можно снова использовать `openssl rand -base64 16`).
2. Запишите её в `.env`:
   ```
   TELEGRAM_BOT_SECRET="my-secret-string"
   ```
3. При настройке webhook передайте секрет (см. ниже).

## Настройка webhook-а Telegram (после заполнения `.env`)
1. Запустите dev-сервер (`npm run dev`) или задеплойте на HTTPS-домен.
2. Сформируйте URL webhook-а: `https://<домен>/api/telegram/webhook?secret=<TELEGRAM_BOT_SECRET>`.
3. Вызовите `HTTPS`-запрос (можно через curl или Postman):
   ```bash
   curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url":"https://<домен>/api/telegram/webhook?secret=<секрет>"}'
   ```
4. Убедитесь, что ответ Telegram содержит `{"ok":true,...}`.

## Быстрая проверка
1. Создайте `.env`.
2. Заполните все переменные.
3. Выполните:
   ```bash
   npm install
   npx prisma db push
   npm run db:seed
   npm run dev
   ```
4. Перейдите на `http://localhost:3000/login` и авторизуйтесь любым seeded-пользователем.

Теперь окружение полностью готово для разработки и тестирования документооборота.
