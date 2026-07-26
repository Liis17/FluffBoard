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

### Запуск на macOS

Помести `.env` в корень FluffBoard и запусти backend так:

```bash
dotnet run --project backend -- --mac
```

Значения из корневого `.env` имеют приоритет. Для отсутствующих в нём настроек backend использует переменные окружения процесса, например переданные контейнером.

## Развёртывание на сервере

Доска уезжает одним Docker-образом: собранный клиент лежит в `wwwroot` рядом с backend, поэтому отдельный веб-сервер для статики не нужен.

```bash
cd docker/fluffboard
cp sample.env .env   # порт, токен GitHub, репозиторий, пользователи доски
docker login docker.barkfluff.com:5000
docker compose up -d
```

Если своего nginx на сервере нет — `docker compose --profile nginx up -d`; site-конфигурация лежит в `docker/nginx/fluffboard.conf`. Образ собирает GitHub Actions на self-hosted раннере при push в `main`. Подробности — в `Obsidian/FluffBoardVault/Развёртывание.md`.
