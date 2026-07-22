# GitHubClient

Parent: [[Index]]

## Назначение

`GitHubClient` получает все issues выбранного GitHub-репозитория и возвращает для каждой номер, заголовок, URL, labels и assignees.

## Файл

- `backend/GitHubClient.cs` — typed `HttpClient` для GitHub REST API, DTO ответа и преобразование данных GitHub в DTO FluffBoard.

## Ключевые методы

| Метод | Описание |
|-------|----------|
| `GetIssuesAsync(owner, repository, cancellationToken)` | Запрашивает все страницы списка issues, исключает pull request'ы и возвращает данные, нужные интерфейсу. |
| `Configure(httpClient, token)` | Настраивает GitHub base URL, заголовки API и необязательную Bearer-авторизацию. |

## Важные детали

GitHub API включает pull request'ы в issues-ответ; записи с полем `pull_request` исключаются. `GitHub__Token` не хранится в файлах проекта и используется только backend для private-репозиториев или увеличения лимита запросов.
