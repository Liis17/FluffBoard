# API

Parent: [[Index]]

## Назначение

ASP.NET Core backend FluffBoard. Настраивает CORS для локального Vite-клиента, возвращает приветственное сообщение и получает issues GitHub-репозитория.

## Файлы

- `backend/Program.cs` — создаёт приложение, регистрирует CORS, объявляет маршрут и запускает сервер.
- `backend/GitHubClient.cs` — HTTP-клиент GitHub REST API и DTO для issues, labels и assignees.
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
| `MapGet("/api/github/repos/{owner}/{repository}/issues", handler)` | Возвращает все issues репозитория без pull request'ов вместе с labels и assignees. |
| `GitHubClient.GetIssuesAsync(...)` | Запрашивает все страницы GitHub REST API, исключает ответы с `pull_request` и преобразует их в DTO приложения. |
| `Run()` | Запускает HTTP-приложение. |

## Зависимости

- Использует: ASP.NET Core, `HttpClient`, GitHub REST API и конфигурацию из `appsettings*.json`.
- Используется в: [[frontend/Приложение]].

## Важные детали

Endpoint и CORS origin привязаны к локальным адресам из `launchSettings.json` и Vite-конфигурации. При изменении порта frontend или backend нужно обновить эти значения и URL запроса в клиенте.

Для private-репозиториев и более высокого лимита GitHub задай токен только через переменную окружения `GitHub__Token`; в `appsettings*.json` секрет не хранится. Без токена доступны public-репозитории в анонимном лимите GitHub.
