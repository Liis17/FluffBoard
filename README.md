# FluffBoard

FluffBoard — небольшая Kanban-доска одного GitHub-репозитория. Она читает актуальные issues из GitHub и создаёт или изменяет их от имени сервисного GitHub-аккаунта.

## Настройка

1. Скопируй `.env.example` в `.env`.
2. Укажи GitHub fine-grained token с разрешением **Issues: Read and write** для нужной репозитории.
3. Укажи `Board__Repository__Owner`, `Board__Repository__Name` и хотя бы одного `Board__Users__N__Username`/`Password`.

`.env` и папка `data/` не попадают в Git. Пользователи при запуске синхронизируются в локальную SQLite-базу; пароли сохраняются только как PBKDF2-хеши.

## Запуск

В разных терминалах:

```bash
dotnet run --project backend
npm run dev --prefix frontend
```

Открой адрес Vite, обычно `http://localhost:5173`. В development-режиме Vite проксирует `/api` на `http://localhost:5279`.
