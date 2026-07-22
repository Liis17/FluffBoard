var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient<GitHubClient>(client =>
    GitHubClient.Configure(client, builder.Configuration["GitHub:Token"]));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

app.MapGet("/api/hello", () => Results.Ok(new
{
    message = "Hello from the .NET 10 backend!"
}));

app.MapGet("/api/github/repos/{owner}/{repository}/issues", async (
    string owner,
    string repository,
    GitHubClient gitHubClient,
    CancellationToken cancellationToken) =>
{
    try
    {
        var issues = await gitHubClient.GetIssuesAsync(owner, repository, cancellationToken);
        return Results.Ok(issues);
    }
    catch (GitHubApiException exception)
    {
        return Results.Problem(
            detail: exception.Message,
            statusCode: (int)exception.StatusCode,
            title: "GitHub request failed");
    }
    catch (HttpRequestException)
    {
        return Results.Problem(
            detail: "Could not connect to GitHub.",
            statusCode: StatusCodes.Status502BadGateway,
            title: "GitHub request failed");
    }
});

app.Run();
