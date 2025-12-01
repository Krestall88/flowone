-- Проверка записей HealthCheck
SELECT id, date, "userId", "signedAt" FROM "HealthCheck" ORDER BY date DESC LIMIT 20;

-- Проверка записей TemperatureEntry
SELECT id, "equipmentId", date, morning, evening, "userId" FROM "TemperatureEntry" ORDER BY date DESC LIMIT 20;

-- Проверка пользователей
SELECT id, email, name FROM "User" ORDER BY id;
