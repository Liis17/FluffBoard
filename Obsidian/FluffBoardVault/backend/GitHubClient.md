# GitHubClient

Parent: [[Index]]

## Назначение

`GitHubClient` — единственная граница backend с GitHub REST API. Он получает актуальные issues и labels, создаёт и обновляет issues от имени сервисного аккаунта.

## Ключевые методы

| Метод | Описание |
|---|---|
| `GetIssuesAsync(...)` | Загружает все страницы issues, исключает pull request'ы и возвращает номер, заголовок, body, state, URL, labels и assignees. |
| `GetLabelsAsync(...)` | Загружает все labels репозитория для редактора задачи. |
| `CreateIssueAsync(...)` | Создаёт задачу с описанием, labels и исполнителем. |
| `UpdateIssueAsync(...)` | Обновляет поля и state существующей задачи. |
| `EnsureWorkflowLabelsAsync(...)` | Создаёт отсутствующие labels `todo`, `in-progress`, `done` перед записью задачи. |
| `Configure(...)` | Настраивает base URL, обязательные GitHub-заголовки и Bearer token. |

## Важные детали

GitHub включает pull request'ы в issues-ответ; записи с полем `pull_request` исключаются. Пагинация не зависит от конкретного параметра: клиент переходит по URL из `Link: rel="next"`, поэтому работает и с page-, и с cursor-based выдачей GitHub. Токен берётся только из `GitHub__Token` на backend.
