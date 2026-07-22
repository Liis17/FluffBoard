# API

Parent: [[Index]]

## Назначение

Минимальный ASP.NET Core backend FluffBoard. Настраивает CORS для локального Vite-клиента и возвращает приветственное сообщение.

## Файлы

- `backend/Program.cs` — создаёт приложение, регистрирует CORS, объявляет маршрут и запускает сервер.
- `backend/backend.csproj` — web SDK, target framework `net10.0`, nullable и implicit usings.
- `backend/Properties/launchSettings.json` — development-профиль HTTP на порту `5279`.
- `backend/appsettings.json` — базовые уровни логирования и allowed hosts.
- `backend/appsettings.Development.json` — development-переопределение логирования.
- `backend/backend.http` — HTTP-запросы для ручной проверки API.

## Ключевые методы/функции

| Метод | Описание |
|-------|----------|
| `AddCors(options)` | Регистрирует default policy для `http://localhost:5173` с любыми заголовками и HTTP-методами. |
| `UseCors()` | Применяет default CORS policy к запросам приложения. |
| `MapGet("/api/hello", handler)` | Возвращает `200 OK` с JSON-объектом `{ message }`. |
| `Run()` | Запускает HTTP-приложение. |

## Зависимости

- Использует: ASP.NET Core, конфигурацию из `appsettings*.json`.
- Используется в: [[frontend/Приложение]].

## Важные детали

Endpoint и CORS origin привязаны к локальным адресам из `launchSettings.json` и Vite-конфигурации. При изменении порта frontend или backend нужно обновить эти значения и URL запроса в клиенте.
