using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

DotEnv.LoadMissingEnvironmentVariables(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

var boardOptions = builder.Configuration.GetSection("Board").Get<BoardOptions>() ?? new BoardOptions();
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
        return Results.Ok(labels);
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
    var validationProblem = ValidateIssueRequest(request, allowClosed: false);
    if (validationProblem is not null)
    {
        return validationProblem;
    }

    try
    {
        var issue = await gitHubClient.CreateIssueAsync(
            options.Repository.Owner,
            options.Repository.Name,
            new IssueDraft(request.Title.Trim(), request.Body?.Trim(), NormalizeLabels(request.Labels), NormalizeAssignees(request.Assignee)),
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
    var validationProblem = ValidateIssueRequest(request, allowClosed: true);
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
                NormalizeAssignees(request.Assignee),
                request.State!),
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

static IResult? ValidateIssueRequest(IssueRequest request, bool allowClosed)
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest(new { detail = "A task title is required." });
    }

    if (request.Title.Length > 256)
    {
        return Results.BadRequest(new { detail = "Task title must contain at most 256 characters." });
    }

    if (allowClosed && request.State is not ("open" or "closed"))
    {
        return Results.BadRequest(new { detail = "Task state must be open or closed." });
    }

    return null;
}

static IReadOnlyList<string> NormalizeLabels(IReadOnlyList<string>? labels) => labels?
    .Select(label => label.Trim())
    .Where(label => label.Length > 0)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList() ?? [];

static IReadOnlyList<string> NormalizeAssignees(string? assignee) =>
    string.IsNullOrWhiteSpace(assignee) ? [] : [assignee.Trim()];

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

public sealed record IssueRequest(string Title, string? Body, IReadOnlyList<string>? Labels, string? Assignee, string? State);
