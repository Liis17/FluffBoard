using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

public sealed class GitHubClient(HttpClient httpClient)
{
    private const string StatusPrefix = "status:";
    private const string PriorityPrefix = "priority:";
    private const string PlatformPrefix = "platform:";
    private const string DefaultStatus = "todo";
    private const string DoneStatus = "done";
    private const string NoPriority = "none";

    // Порядок каталога — это порядок колонок доски: путь задачи слева направо. «Отложено» стоит
    // за «Готово», потому что оно вне этого пути, а не следующий его шаг. Цвета трёх исходных
    // статусов из 01-tokens.md, у добавленных взяты из палитры пользовательских колонок оттуда же.
    private static readonly ServiceLabelEntry[] StatusCatalog =
    [
        new("planning", "Планирование", "7c3aed"),
        new(DefaultStatus, "К выполнению", "f59e0b"),
        new("in-progress", "В работе", "2563eb"),
        new("testing", "Тестирование", "0891b2"),
        new(DoneStatus, "Готово", "16a34a"),
        new("deferred", "Отложено", "64748b")
    ];

    private static readonly ServiceLabelEntry[] PriorityCatalog =
    [
        new("urgent", "Срочно", "dc2626"),
        new("high", "Высокий", "ea580c"),
        new("medium", "Средний", "ca8a04"),
        new("low", "Низкий", "64748b")
    ];

    // Каталог платформ закрыт: в отличие от статусов, своих платформ пользователь не заводит.
    // Порядок — от сервера к клиентам: бэкенд, веб, десктоп, мобильные. Цвета четырёх первых
    // унаследованы от лейблов, которые в репозитории уже были до переименования.
    private static readonly ServiceLabelEntry[] PlatformCatalog =
    [
        new("backend", "Бэкенд", "1d76db"),
        new("web", "Веб", "688b0b"),
        new("windows", "Windows", "8644f4"),
        new("mac", "macOS", "475569"),
        new("android", "Android", "6aa218"),
        new("iphone", "iPhone", "0891b2")
    ];

    // Цвета создаваемых колонок и меток берутся по кругу — 01-tokens.md, раздел про статусы.
    private static readonly string[] CustomLabelPalette = ["db2777", "7c3aed", "0891b2", "ca8a04", "ea580c"];

    private static readonly ConcurrentDictionary<string, byte> EnsuredLabels = new();

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task<IReadOnlyList<GitHubIssue>> GetIssuesAsync(
        string owner,
        string repository,
        CancellationToken cancellationToken)
    {
        var issues = await GetAllAsync<GitHubIssueResponse>(
            $"repos/{RepositoryPath(owner, repository)}/issues?state=all&per_page=100",
            cancellationToken);

        return issues
            .Where(issue => issue.PullRequest.ValueKind == JsonValueKind.Undefined)
            .Select(ToIssue)
            .ToList();
    }

    public async Task<IReadOnlyList<GitHubLabel>> GetLabelsAsync(
        string owner,
        string repository,
        CancellationToken cancellationToken)
    {
        var labels = await GetAllAsync<GitHubLabelResponse>(
            $"repos/{RepositoryPath(owner, repository)}/labels?per_page=100",
            cancellationToken);

        return labels.Select(label => new GitHubLabel(label.Name, label.Color)).ToList();
    }

    public async Task<IReadOnlyList<BoardStatus>> GetStatusesAsync(
        string owner,
        string repository,
        CancellationToken cancellationToken)
    {
        var statusLabels = (await GetLabelsAsync(owner, repository, cancellationToken))
            .Where(label => label.Name.StartsWith(StatusPrefix, StringComparison.OrdinalIgnoreCase))
            .Select(label => new { Key = label.Name[StatusPrefix.Length..], label.Color })
            .Where(status => status.Key.Length > 0)
            .ToList();

        // Встроенные статусы возвращаются всегда, даже если лейблов в репозитории ещё нет,
        // иначе свежий репозиторий остался бы без колонок.
        var statuses = StatusCatalog
            .Select(entry => new BoardStatus(
                entry.Key,
                entry.Name,
                statusLabels.FirstOrDefault(status => KeysEqual(status.Key, entry.Key))?.Color ?? entry.Color))
            .ToList();

        statuses.AddRange(statusLabels
            .Where(status => CatalogIndex(StatusCatalog, status.Key) == int.MaxValue)
            .OrderBy(status => status.Key, StringComparer.OrdinalIgnoreCase)
            .Select(status => new BoardStatus(status.Key, status.Key, status.Color)));

        return statuses;
    }

    public async Task<BoardStatus> CreateStatusAsync(
        string owner,
        string repository,
        string name,
        CancellationToken cancellationToken)
    {
        var existing = await GetStatusesAsync(owner, repository, cancellationToken);
        if (existing.Any(status => KeysEqual(status.Key, name)))
        {
            throw new GitHubApiException(HttpStatusCode.Conflict, "Колонка с таким названием уже есть.");
        }

        var customCount = existing.Count(status => CatalogIndex(StatusCatalog, status.Key) == int.MaxValue);
        var color = CustomLabelPalette[customCount % CustomLabelPalette.Length];
        var label = await SendAsync<GitHubLabelResponse>(
            HttpMethod.Post,
            $"repos/{RepositoryPath(owner, repository)}/labels",
            new { name = StatusPrefix + name, color },
            cancellationToken);

        return new BoardStatus(name, name, label.Color);
    }

    /// <summary>
    /// Создаёт обычную метку. Цвет берётся по кругу от числа уже заведённых меток, потому что
    /// выбрать его в интерфейсе негде, — так же устроены пользовательские колонки.
    /// </summary>
    public async Task<GitHubLabel> CreateLabelAsync(
        string owner,
        string repository,
        string name,
        CancellationToken cancellationToken)
    {
        var existing = await GetLabelsAsync(owner, repository, cancellationToken);
        if (existing.Any(label => KeysEqual(label.Name, name)))
        {
            throw new GitHubApiException(HttpStatusCode.Conflict, "Метка с таким названием уже есть.");
        }

        var color = CustomLabelPalette[existing.Count(label => !IsServiceLabel(label.Name)) % CustomLabelPalette.Length];
        var created = await SendAsync<GitHubLabelResponse>(
            HttpMethod.Post,
            $"repos/{RepositoryPath(owner, repository)}/labels",
            new { name, color },
            cancellationToken);

        return new GitHubLabel(created.Name, created.Color);
    }

    public async Task<GitHubIssue> CreateIssueAsync(
        string owner,
        string repository,
        IssueDraft issue,
        CancellationToken cancellationToken)
    {
        var labels = ComposeLabels(issue.Labels, issue.Status, issue.Priority, issue.Platforms);
        await EnsureServiceLabelsAsync(owner, repository, labels, cancellationToken);
        var response = await SendAsync<GitHubIssueResponse>(
            HttpMethod.Post,
            $"repos/{RepositoryPath(owner, repository)}/issues",
            new
            {
                title = issue.Title,
                body = issue.Body,
                labels,
                assignees = issue.Assignees
            },
            cancellationToken);

        // Создать issue сразу закрытым GitHub не позволяет, поэтому задачу в статусе
        // «Готово» закрываем вторым запросом — иначе статус и state разойдутся.
        if (KeysEqual(issue.Status, DoneStatus))
        {
            response = await SendAsync<GitHubIssueResponse>(
                HttpMethod.Patch,
                $"repos/{RepositoryPath(owner, repository)}/issues/{response.Number}",
                new { state = "closed" },
                cancellationToken);
        }

        return ToIssue(response);
    }

    public async Task<GitHubIssue> UpdateIssueAsync(
        string owner,
        string repository,
        int number,
        IssueUpdate issue,
        CancellationToken cancellationToken)
    {
        var labels = ComposeLabels(issue.Labels, issue.Status, issue.Priority, issue.Platforms);
        await EnsureServiceLabelsAsync(owner, repository, labels, cancellationToken);
        var response = await SendAsync<GitHubIssueResponse>(
            HttpMethod.Patch,
            $"repos/{RepositoryPath(owner, repository)}/issues/{number}",
            new
            {
                title = issue.Title,
                body = issue.Body,
                labels,
                assignees = issue.Assignees,
                state = KeysEqual(issue.Status, DoneStatus) ? "closed" : "open"
            },
            cancellationToken);
        return ToIssue(response);
    }

    public static bool IsServiceLabel(string name) =>
        name.StartsWith(StatusPrefix, StringComparison.OrdinalIgnoreCase) ||
        name.StartsWith(PriorityPrefix, StringComparison.OrdinalIgnoreCase) ||
        name.StartsWith(PlatformPrefix, StringComparison.OrdinalIgnoreCase);

    public static bool IsKnownPriority(string priority) =>
        KeysEqual(priority, NoPriority) || CatalogIndex(PriorityCatalog, priority) != int.MaxValue;

    public static bool IsKnownPlatform(string platform) =>
        CatalogIndex(PlatformCatalog, platform) != int.MaxValue;

    public static void Configure(HttpClient httpClient, string? token)
    {
        httpClient.BaseAddress = new Uri("https://api.github.com/");
        httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("FluffBoard", "1.0"));
        httpClient.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2026-03-10");

        if (!string.IsNullOrWhiteSpace(token))
        {
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }
    }

    /// <summary>
    /// Создаёт отсутствующие служебные лейблы с каноническим цветом. Статус присутствует в каждой
    /// записи, поэтому вычитывать весь список лейблов репозитория нельзя — вместо этого лейбл
    /// создаётся сразу, а <c>422 already_exists</c> означает, что он уже на месте. Успешно
    /// проверенные лейблы кешируются на время жизни процесса: клиент транзиентный, кеш статический.
    /// </summary>
    private async Task EnsureServiceLabelsAsync(
        string owner,
        string repository,
        IEnumerable<string> labels,
        CancellationToken cancellationToken)
    {
        foreach (var label in labels.Where(IsServiceLabel))
        {
            var color = ServiceLabelColor(label);
            var cacheKey = $"{owner}/{repository}/{label}";

            // Цвет пользовательского статуса пока задать негде, поэтому его создание
            // оставляем GitHub — он назначит лейблу случайный цвет.
            if (color is null || EnsuredLabels.ContainsKey(cacheKey))
            {
                continue;
            }

            try
            {
                await SendAsync<GitHubLabelResponse>(
                    HttpMethod.Post,
                    $"repos/{RepositoryPath(owner, repository)}/labels",
                    new { name = label, color },
                    cancellationToken);
            }
            catch (GitHubApiException exception) when (exception.StatusCode == HttpStatusCode.UnprocessableEntity)
            {
                // Лейбл уже создан — ровно то состояние, которое нужно.
            }
            catch (GitHubApiException)
            {
                // Канонический цвет — косметика, поэтому её неудача не должна ронять запись задачи:
                // GitHub сам создаст лейбл со случайным цветом при применении. Настоящие проблемы
                // (например нехватка прав у токена) всплывут на записи самой задачи. Кеш не трогаем —
                // существование лейбла не подтверждено.
                continue;
            }

            EnsuredLabels[cacheKey] = 0;
        }
    }

    private async Task<List<T>> GetAllAsync<T>(string path, CancellationToken cancellationToken)
    {
        var values = new List<T>();
        string? nextPath = path;

        while (!string.IsNullOrEmpty(nextPath))
        {
            using var response = await httpClient.GetAsync(nextPath, cancellationToken);
            await EnsureSuccessAsync(response);
            var page = await response.Content.ReadFromJsonAsync<List<T>>(JsonOptions, cancellationToken) ?? [];
            values.AddRange(page);
            nextPath = GetNextLink(response);
        }

        return values;
    }

    private async Task<T> SendAsync<T>(HttpMethod method, string path, object body, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(method, path)
        {
            Content = JsonContent.Create(body, options: JsonOptions)
        };
        using var response = await httpClient.SendAsync(request, cancellationToken);
        await EnsureSuccessAsync(response);
        return await response.Content.ReadFromJsonAsync<T>(JsonOptions, cancellationToken)
            ?? throw new GitHubApiException(response.StatusCode, "GitHub returned an empty response.");
    }

    private static async Task EnsureSuccessAsync(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var error = await response.Content.ReadFromJsonAsync<GitHubErrorResponse>(JsonOptions);
        throw new GitHubApiException(response.StatusCode, error?.Message ?? GetErrorMessage(response.StatusCode));
    }

    private static string? GetNextLink(HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Link", out var links))
        {
            return null;
        }

        foreach (var link in links.SelectMany(header => header.Split(',')))
        {
            if (!link.Contains("rel=\"next\"", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var start = link.IndexOf('<') + 1;
            var end = link.IndexOf('>', start);
            if (start > 0 && end > start)
            {
                return link[start..end];
            }
        }

        return null;
    }

    private static GitHubIssue ToIssue(GitHubIssueResponse issue)
    {
        var labels = issue.Labels.Select(label => new GitHubLabel(label.Name, label.Color)).ToList();

        return new GitHubIssue(
            issue.Number,
            issue.Title,
            issue.Body ?? "",
            issue.State,
            issue.HtmlUrl,
            labels.Where(label => !IsServiceLabel(label.Name)).ToList(),
            issue.Assignees.Select(assignee => new GitHubAssignee(assignee.Login, assignee.AvatarUrl)).ToList(),
            // Задачи без лейбла статуса раскладываются по state: закрытые готовы, остальные в очереди.
            SelectServiceKey(labels, StatusPrefix, StatusCatalog)
                ?? (string.Equals(issue.State, "closed", StringComparison.OrdinalIgnoreCase) ? DoneStatus : DefaultStatus),
            SelectServiceKey(labels, PriorityPrefix, PriorityCatalog) ?? NoPriority,
            SelectPlatforms(labels));
    }

    /// <summary>
    /// Платформа — единственное многозначное служебное измерение: задача честно может относиться
    /// сразу к нескольким. Каталог закрыт, поэтому неизвестный ключ отбрасывается: колонки доски
    /// строятся по каталогу, показать такую платформу негде, а следующее сохранение из UI её снимет.
    /// </summary>
    private static List<string> SelectPlatforms(IEnumerable<GitHubLabel> labels) =>
        labels
            .Where(label => label.Name.StartsWith(PlatformPrefix, StringComparison.OrdinalIgnoreCase))
            .Select(label => label.Name[PlatformPrefix.Length..])
            .Where(IsKnownPlatform)
            .OrderBy(key => CatalogIndex(PlatformCatalog, key))
            .ToList();

    /// <summary>
    /// Возвращает ключ служебного лейбла. Задача должна иметь не больше одного статуса и одного
    /// приоритета; если лейблов навесили вручную больше, побеждает первый по каноническому порядку —
    /// для приоритета это самый высокий уровень.
    /// </summary>
    private static string? SelectServiceKey(
        IEnumerable<GitHubLabel> labels,
        string prefix,
        ServiceLabelEntry[] catalog) =>
        labels
            .Where(label => label.Name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            .Select(label => label.Name[prefix.Length..])
            .Where(key => key.Length > 0)
            .OrderBy(key => CatalogIndex(catalog, key))
            .ThenBy(key => key, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault();

    private static List<string> ComposeLabels(
        IReadOnlyList<string> labels,
        string status,
        string priority,
        IReadOnlyList<string> platforms)
    {
        var composed = new List<string>(labels) { StatusPrefix + status };

        if (!KeysEqual(priority, NoPriority))
        {
            composed.Add(PriorityPrefix + priority);
        }

        composed.AddRange(platforms.Select(platform => PlatformPrefix + platform));

        return composed;
    }

    private static string? ServiceLabelColor(string label) => label switch
    {
        _ when label.StartsWith(StatusPrefix, StringComparison.OrdinalIgnoreCase) =>
            FindEntry(StatusCatalog, label[StatusPrefix.Length..])?.Color,
        _ when label.StartsWith(PriorityPrefix, StringComparison.OrdinalIgnoreCase) =>
            FindEntry(PriorityCatalog, label[PriorityPrefix.Length..])?.Color,
        _ when label.StartsWith(PlatformPrefix, StringComparison.OrdinalIgnoreCase) =>
            FindEntry(PlatformCatalog, label[PlatformPrefix.Length..])?.Color,
        _ => null
    };

    private static ServiceLabelEntry? FindEntry(ServiceLabelEntry[] catalog, string key) =>
        catalog.FirstOrDefault(entry => KeysEqual(entry.Key, key));

    private static int CatalogIndex(ServiceLabelEntry[] catalog, string key)
    {
        var index = Array.FindIndex(catalog, entry => KeysEqual(entry.Key, key));
        return index < 0 ? int.MaxValue : index;
    }

    private static bool KeysEqual(string left, string right) =>
        string.Equals(left, right, StringComparison.OrdinalIgnoreCase);

    private static string RepositoryPath(string owner, string repository) =>
        $"{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repository)}";

    private static string GetErrorMessage(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.NotFound => "Repository was not found or is not available to this token.",
        HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => "GitHub denied access. Check the service account token and repository permissions.",
        _ => "GitHub could not complete the request."
    };

    private sealed record GitHubIssueResponse(
        int Number,
        string Title,
        string? Body,
        string State,
        [property: JsonPropertyName("html_url")] string HtmlUrl,
        [property: JsonPropertyName("pull_request")] JsonElement PullRequest,
        List<GitHubLabelResponse>? Labels,
        List<GitHubAssigneeResponse>? Assignees)
    {
        public List<GitHubLabelResponse> Labels { get; init; } = Labels ?? [];
        public List<GitHubAssigneeResponse> Assignees { get; init; } = Assignees ?? [];
    }

    private sealed record GitHubLabelResponse(string Name, string Color);

    private sealed record GitHubAssigneeResponse(
        string Login,
        [property: JsonPropertyName("avatar_url")] string AvatarUrl);

    private sealed record GitHubErrorResponse(string? Message);

    private sealed record ServiceLabelEntry(string Key, string Name, string Color);
}

public sealed record GitHubIssue(
    int Number,
    string Title,
    string Body,
    string State,
    string HtmlUrl,
    IReadOnlyList<GitHubLabel> Labels,
    IReadOnlyList<GitHubAssignee> Assignees,
    string Status,
    string Priority,
    IReadOnlyList<string> Platforms);

public sealed record GitHubLabel(string Name, string Color);

public sealed record GitHubAssignee(string Login, string AvatarUrl);

public sealed record BoardStatus(string Key, string Name, string Color);

public sealed record IssueDraft(
    string Title,
    string? Body,
    IReadOnlyList<string> Labels,
    IReadOnlyList<string> Assignees,
    string Status,
    string Priority,
    IReadOnlyList<string> Platforms);

public sealed record IssueUpdate(
    string Title,
    string? Body,
    IReadOnlyList<string> Labels,
    IReadOnlyList<string> Assignees,
    string Status,
    string Priority,
    IReadOnlyList<string> Platforms);

public sealed class GitHubApiException(HttpStatusCode statusCode, string message) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
}
