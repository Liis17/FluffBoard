using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

var processArguments = Environment.GetCommandLineArgs();
var macMode = args.Any(argument => string.Equals(argument.Trim(), "--mac", StringComparison.OrdinalIgnoreCase)) ||
              processArguments.Any(argument => string.Equals(argument.Trim(), "--mac", StringComparison.OrdinalIgnoreCase));
Console.WriteLine($"[startup] application args: {string.Join(' ', args)}");
Console.WriteLine($"[startup] process args: {string.Join(' ', processArguments)}");
Console.WriteLine($"[startup] mac mode: {macMode}");
var applicationArgs = args
    .Where(argument => !string.Equals(argument.Trim(), "--mac", StringComparison.OrdinalIgnoreCase))
    .ToArray();
var environmentFile = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "..", ".env"));

DotEnv.LoadEnvironmentVariables(environmentFile, overwriteExisting: macMode);

var builder = WebApplication.CreateBuilder(applicationArgs);
builder.Configuration.AddEnvironmentVariables();

var boardOptions = builder.Configuration.GetSection("Board").Get<BoardOptions>() ?? new BoardOptions();
Console.WriteLine($"[startup] Board:Repository:Owner={boardOptions.Repository.Owner}");
Console.WriteLine($"[startup] Board:Repository:Name={boardOptions.Repository.Name}");
ValidateBoardOptions(boardOptions);

builder.Services.AddSingleton(boardOptions);
builder.Services.AddSingleton<BoardDatabase>();
builder.Services.AddHttpClient<GitHubClient>(client =>
    GitHubClient.Configure(client, builder.Configuration["GitHub:Token"]));
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "FluffBoard.Session";
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials());
});

var app = builder.Build();

await app.Services.GetRequiredService<BoardDatabase>()
    .InitializeAsync(boardOptions.Users, CancellationToken.None);

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/hello", () => Results.Ok(new
{
    message = "Hello from the .NET 10 backend!"
}));

app.MapPost("/api/auth/login", async (
    LoginRequest request,
    HttpContext context,
    BoardDatabase database,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { detail = "Username and password are required." });
    }

    var user = await database.AuthenticateAsync(request.Username.Trim(), request.Password, cancellationToken);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    var principal = new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        ],
        CookieAuthenticationDefaults.AuthenticationScheme));
    await context.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);
    return Results.Ok(ToProfile(user));
});

app.MapPost("/api/auth/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.NoContent();
});

var board = app.MapGroup("/api/board").RequireAuthorization();

board.MapGet("/me", async (ClaimsPrincipal principal, BoardDatabase database, CancellationToken cancellationToken) =>
{
    var userId = GetUserId(principal);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var user = await database.GetUserAsync(userId.Value, cancellationToken);
    return user is null ? Results.Unauthorized() : Results.Ok(ToProfile(user));
});

board.MapGet("/users", async (BoardDatabase database, CancellationToken cancellationToken) =>
    Results.Ok(await database.GetProfilesAsync(cancellationToken)));

board.MapGet("/issues", async (GitHubClient gitHubClient, BoardOptions options, CancellationToken cancellationToken) =>
{
    try
    {
        var issues = await gitHubClient.GetIssuesAsync(options.Repository.Owner, options.Repository.Name, cancellationToken);
        return Results.Ok(issues);
    }
    catch (Exception exception) when (IsGitHubFailure(exception))
    {
        return ToGitHubProblem(exception);
    }
});

board.MapGet("/labels", async (GitHubClient gitHubClient, BoardOptions options, CancellationToken cancellationToken) =>
{
    try
    {
        var labels = await gitHubClient.GetLabelsAsync(options.Repository.Owner, options.Repository.Name, cancellationToken);
        // Служебные лейблы редактируются статусом и приоритетом, в выборе обычных меток им не место.
        return Results.Ok(labels.Where(label => !GitHubClient.IsServiceLabel(label.Name)));
    }
    catch (Exception exception) when (IsGitHubFailure(exception))
    {
        return ToGitHubProblem(exception);
    }
});

board.MapGet("/statuses", async (GitHubClient gitHubClient, BoardOptions options, CancellationToken cancellationToken) =>
{
    try
    {
        var statuses = await gitHubClient.GetStatusesAsync(options.Repository.Owner, options.Repository.Name, cancellationToken);
        return Results.Ok(statuses);
    }
    catch (Exception exception) when (IsGitHubFailure(exception))
    {
        return ToGitHubProblem(exception);
    }
});

board.MapPost("/issues", async (
    IssueRequest request,
    GitHubClient gitHubClient,
    BoardOptions options,
    CancellationToken cancellationToken) =>
{
    var validationProblem = ValidateIssueRequest(request);
    if (validationProblem is not null)
    {
        return validationProblem;
    }

    try
    {
        var issue = await gitHubClient.CreateIssueAsync(
            options.Repository.Owner,
            options.Repository.Name,
            new IssueDraft(
                request.Title.Trim(),
                request.Body?.Trim(),
                NormalizeLabels(request.Labels),
                NormalizeAssignees(request.Assignees),
                NormalizeStatus(request.Status),
                NormalizePriority(request.Priority)),
            cancellationToken);
        return Results.Created($"/api/board/issues/{issue.Number}", issue);
    }
    catch (Exception exception) when (IsGitHubFailure(exception))
    {
        return ToGitHubProblem(exception);
    }
});

board.MapPut("/issues/{number:int}", async (
    int number,
    IssueRequest request,
    GitHubClient gitHubClient,
    BoardOptions options,
    CancellationToken cancellationToken) =>
{
    var validationProblem = ValidateIssueRequest(request);
    if (validationProblem is not null)
    {
        return validationProblem;
    }

    try
    {
        var issue = await gitHubClient.UpdateIssueAsync(
            options.Repository.Owner,
            options.Repository.Name,
            number,
            new IssueUpdate(
                request.Title.Trim(),
                request.Body?.Trim(),
                NormalizeLabels(request.Labels),
                NormalizeAssignees(request.Assignees),
                NormalizeStatus(request.Status),
                NormalizePriority(request.Priority)),
            cancellationToken);
        return Results.Ok(issue);
    }
    catch (Exception exception) when (IsGitHubFailure(exception))
    {
        return ToGitHubProblem(exception);
    }
});

app.Run();

static void ValidateBoardOptions(BoardOptions options)
{
    if (string.IsNullOrWhiteSpace(options.Repository.Owner) || string.IsNullOrWhiteSpace(options.Repository.Name))
    {
        throw new InvalidOperationException("Configure Board__Repository__Owner and Board__Repository__Name in .env.");
    }

    if (options.Users.Count == 0 || options.Users.Any(user => string.IsNullOrWhiteSpace(user.Username) || string.IsNullOrWhiteSpace(user.Password)))
    {
        throw new InvalidOperationException("Configure at least one Board__Users__N__Username and Board__Users__N__Password pair in .env.");
    }
}

static int? GetUserId(ClaimsPrincipal principal) =>
    int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) ? userId : null;

static BoardUserProfile ToProfile(BoardUser user) => new(user.Id, user.Username, user.GitHubLogin);

static IResult? ValidateIssueRequest(IssueRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { detail = "A task title is required." });
    }

    if (request.Title.Length > 256)
    {
        return Results.BadRequest(new { detail = "Task title must contain at most 256 characters." });
    }

    if (!GitHubClient.IsKnownPriority(NormalizePriority(request.Priority)))
    {
        return Results.BadRequest(new { detail = "Task priority must be urgent, high, medium, low or none." });
    }

    return null;
}

// Служебные лейблы собирает GitHubClient из Status и Priority, поэтому присланные клиентом
// status:* и priority:* отбрасываются — иначе они попали бы в задачу дважды.
static IReadOnlyList<string> NormalizeLabels(IReadOnlyList<string>? labels) => labels?
    .Select(label => label.Trim())
    .Where(label => label.Length > 0 && !GitHubClient.IsServiceLabel(label))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList() ?? [];

static string NormalizeStatus(string? status) => string.IsNullOrWhiteSpace(status) ? "todo" : status.Trim();

static string NormalizePriority(string? priority) => string.IsNullOrWhiteSpace(priority) ? "none" : priority.Trim();

static IReadOnlyList<string> NormalizeAssignees(IReadOnlyList<string>? assignees) => assignees?
    .Select(assignee => assignee.Trim())
    .Where(assignee => assignee.Length > 0)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList() ?? [];

static bool IsGitHubFailure(Exception exception) => exception is GitHubApiException or HttpRequestException;

static IResult ToGitHubProblem(Exception exception) => exception switch
{
    GitHubApiException gitHubException => Results.Problem(
        detail: gitHubException.Message,
        statusCode: (int)gitHubException.StatusCode,
        title: "GitHub request failed"),
    HttpRequestException => Results.Problem(
        detail: "Could not connect to GitHub.",
        statusCode: StatusCodes.Status502BadGateway,
        title: "GitHub request failed"),
    _ => Results.Problem(statusCode: StatusCodes.Status500InternalServerError)
};

public sealed record LoginRequest(string Username, string Password);

public sealed record IssueRequest(
    string Title,
    string? Body,
    IReadOnlyList<string>? Labels,
    IReadOnlyList<string>? Assignees,
    string? Status,
    string? Priority);
