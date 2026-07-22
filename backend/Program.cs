var builder = WebApplication.CreateBuilder(args);

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

app.Run();
