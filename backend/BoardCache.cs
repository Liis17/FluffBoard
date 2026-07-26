using Microsoft.Extensions.Caching.Memory;

/// <summary>
/// Короткий кэш ответов GitHub для одной доски. Ссылки на аватары уже входят в issues и
/// комментарии, поэтому кэшируются вместе с ними и не требуют отдельного запроса к GitHub.
/// </summary>
public sealed class BoardCache(IMemoryCache memoryCache)
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(1);

    public Task<IReadOnlyList<GitHubIssue>> GetIssuesAsync(Func<Task<IReadOnlyList<GitHubIssue>>> valueFactory) =>
        GetAsync("issues", valueFactory);

    public Task<IReadOnlyList<GitHubComment>> GetCommentsAsync(
        int number,
        Func<Task<IReadOnlyList<GitHubComment>>> valueFactory) =>
        GetAsync($"comments:{number}", valueFactory);

    public Task<IReadOnlyList<GitHubLabel>> GetLabelsAsync(Func<Task<IReadOnlyList<GitHubLabel>>> valueFactory) =>
        GetAsync("labels", valueFactory);

    public Task<IReadOnlyList<BoardStatus>> GetStatusesAsync(Func<Task<IReadOnlyList<BoardStatus>>> valueFactory) =>
        GetAsync("statuses", valueFactory);

    public Task<IReadOnlyList<GitHubAssignee>> GetAssigneesAsync(Func<Task<IReadOnlyList<GitHubAssignee>>> valueFactory) =>
        GetAsync("assignees", valueFactory);

    public void InvalidateIssues() => memoryCache.Remove("issues");

    public void InvalidateLabelsAndStatuses()
    {
        memoryCache.Remove("labels");
        memoryCache.Remove("statuses");
    }

    private async Task<T> GetAsync<T>(string key, Func<Task<T>> valueFactory)
    {
        if (memoryCache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return cached;
        }

        return await memoryCache.GetOrCreateAsync(key, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = Lifetime;
            return await valueFactory();
        }) ?? throw new InvalidOperationException($"Cache factory for '{key}' returned no value.");
    }
}
