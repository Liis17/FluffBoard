using System.Net;
using System.Net.Http.Headers;
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
        var issues = new List<GitHubIssueResponse>();
        var page = 1;

        while (true)
        {
            var url = $"repos/{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repository)}/issues?state=all&per_page=100&page={page}";
            using var response = await httpClient.GetAsync(url, cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                throw new GitHubApiException(response.StatusCode, GetErrorMessage(response.StatusCode));
            }

            var issuePage = await response.Content.ReadFromJsonAsync<List<GitHubIssueResponse>>(JsonOptions, cancellationToken)
                ?? [];

            issues.AddRange(issuePage);

            if (issuePage.Count < 100)
            {
                break;
            }

            page++;
        }

        return issues
            .Where(issue => issue.PullRequest.ValueKind == JsonValueKind.Undefined)
            .Select(issue => new GitHubIssue(
                issue.Number,
                issue.Title,
                issue.HtmlUrl,
                issue.Labels.Select(label => new GitHubLabel(label.Name, label.Color)).ToList(),
                issue.Assignees.Select(assignee => new GitHubAssignee(assignee.Login, assignee.AvatarUrl)).ToList()))
            .ToList();
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

    private static string GetErrorMessage(HttpStatusCode statusCode) => statusCode switch
    {
        HttpStatusCode.NotFound => "Repository was not found or is not available to this token.",
        HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => "GitHub denied access. Configure GitHub__Token for private repositories or try again later.",
        _ => "GitHub could not load issues for this repository."
    };

    private sealed record GitHubIssueResponse(
        int Number,
        string Title,
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
}

public sealed record GitHubIssue(
    int Number,
    string Title,
    string HtmlUrl,
    IReadOnlyList<GitHubLabel> Labels,
    IReadOnlyList<GitHubAssignee> Assignees);

public sealed record GitHubLabel(string Name, string Color);

public sealed record GitHubAssignee(string Login, string AvatarUrl);

public sealed class GitHubApiException(HttpStatusCode statusCode, string message) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
}
