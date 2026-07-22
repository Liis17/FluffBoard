using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

public sealed class GitHubClient(HttpClient httpClient)
{
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

    public async Task<GitHubIssue> CreateIssueAsync(
        string owner,
        string repository,
        IssueDraft issue,
        CancellationToken cancellationToken)
    {
        await EnsureWorkflowLabelsAsync(owner, repository, issue.Labels, cancellationToken);
        var response = await SendAsync<GitHubIssueResponse>(
            HttpMethod.Post,
            $"repos/{RepositoryPath(owner, repository)}/issues",
            new
            {
                title = issue.Title,
                body = issue.Body,
                labels = issue.Labels,
                assignees = issue.Assignees
            },
            cancellationToken);
        return ToIssue(response);
    }

    public async Task<GitHubIssue> UpdateIssueAsync(
        string owner,
        string repository,
        int number,
        IssueUpdate issue,
        CancellationToken cancellationToken)
    {
        await EnsureWorkflowLabelsAsync(owner, repository, issue.Labels, cancellationToken);
        var response = await SendAsync<GitHubIssueResponse>(
            HttpMethod.Patch,
            $"repos/{RepositoryPath(owner, repository)}/issues/{number}",
            new
            {
                title = issue.Title,
                body = issue.Body,
                labels = issue.Labels,
                assignees = issue.Assignees,
                state = issue.State
            },
            cancellationToken);
        return ToIssue(response);
    }

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

    private async Task EnsureWorkflowLabelsAsync(
        string owner,
        string repository,
        IReadOnlyList<string> requestedLabels,
        CancellationToken cancellationToken)
    {
        var workflowLabels = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["todo"] = "bfdbfe",
            ["in-progress"] = "fbca04",
            ["done"] = "0e8a16"
        };
        var requiredLabels = requestedLabels
            .Where(workflowLabels.ContainsKey)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (requiredLabels.Count == 0)
        {
            return;
        }

        var existingLabels = await GetLabelsAsync(owner, repository, cancellationToken);
        foreach (var label in requiredLabels.Where(label => existingLabels.All(existing => !string.Equals(existing.Name, label, StringComparison.OrdinalIgnoreCase))))
        {
            await SendAsync<GitHubLabelResponse>(
                HttpMethod.Post,
                $"repos/{RepositoryPath(owner, repository)}/labels",
                new { name = label, color = workflowLabels[label] },
                cancellationToken);
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

    private static GitHubIssue ToIssue(GitHubIssueResponse issue) => new(
        issue.Number,
        issue.Title,
        issue.Body ?? "",
        issue.State,
        issue.HtmlUrl,
        issue.Labels.Select(label => new GitHubLabel(label.Name, label.Color)).ToList(),
        issue.Assignees.Select(assignee => new GitHubAssignee(assignee.Login, assignee.AvatarUrl)).ToList());

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
}

public sealed record GitHubIssue(
    int Number,
    string Title,
    string Body,
    string State,
    string HtmlUrl,
    IReadOnlyList<GitHubLabel> Labels,
    IReadOnlyList<GitHubAssignee> Assignees);

public sealed record GitHubLabel(string Name, string Color);

public sealed record GitHubAssignee(string Login, string AvatarUrl);

public sealed record IssueDraft(string Title, string? Body, IReadOnlyList<string> Labels, IReadOnlyList<string> Assignees);

public sealed record IssueUpdate(string Title, string? Body, IReadOnlyList<string> Labels, IReadOnlyList<string> Assignees, string State);

public sealed class GitHubApiException(HttpStatusCode statusCode, string message) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
}
