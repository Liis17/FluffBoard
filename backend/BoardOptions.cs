public sealed class BoardOptions
{
    public RepositoryOptions Repository { get; init; } = new();

    public List<BoardUserOptions> Users { get; init; } = [];

    public string DatabasePath { get; init; } = "data/fluffboard.db";
}

public sealed class RepositoryOptions
{
    public string Owner { get; init; } = "";

    public string Name { get; init; } = "";
}

public sealed class BoardUserOptions
{
    public string Username { get; init; } = "";

    public string Password { get; init; } = "";

    public string? GitHubLogin { get; init; }

    public long? TelegramId { get; init; }
}

public sealed record BoardUser(int Id, string Username, string? GitHubLogin, long? TelegramId);

public sealed record BoardUserProfile(int Id, string Username, string? GitHubLogin);
