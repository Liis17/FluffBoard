using System.Security.Cryptography;
using Microsoft.Data.Sqlite;

public sealed class BoardDatabase(IHostEnvironment environment, BoardOptions options)
{
    private readonly string connectionString = CreateConnectionString(environment, options.DatabasePath);

    public async Task InitializeAsync(IEnumerable<BoardUserOptions> configuredUsers, CancellationToken cancellationToken)
    {
        var users = configuredUsers.ToList();
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var createTable = connection.CreateCommand();
        createTable.CommandText = """
            CREATE TABLE IF NOT EXISTS BoardUsers (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                PasswordHash TEXT NOT NULL,
                GitHubLogin TEXT NULL,
                TelegramId INTEGER NULL
            );
            """;
        await createTable.ExecuteNonQueryAsync(cancellationToken);

        foreach (var user in users)
        {
            var upsert = connection.CreateCommand();
            upsert.CommandText = """
                INSERT INTO BoardUsers (Username, PasswordHash, GitHubLogin, TelegramId)
                VALUES ($username, $passwordHash, $gitHubLogin, $telegramId)
                ON CONFLICT(Username) DO UPDATE SET
                    PasswordHash = excluded.PasswordHash,
                    GitHubLogin = excluded.GitHubLogin,
                    TelegramId = excluded.TelegramId;
                """;
            upsert.Parameters.AddWithValue("$username", user.Username);
            upsert.Parameters.AddWithValue("$passwordHash", PasswordHasher.Hash(user.Password));
            upsert.Parameters.AddWithValue("$gitHubLogin", (object?)user.GitHubLogin ?? DBNull.Value);
            upsert.Parameters.AddWithValue("$telegramId", (object?)user.TelegramId ?? DBNull.Value);
            await upsert.ExecuteNonQueryAsync(cancellationToken);
        }

        var configuredUsernames = new HashSet<string>(users.Select(user => user.Username), StringComparer.OrdinalIgnoreCase);
        var existingUsernames = new List<string>();
        var selectUsers = connection.CreateCommand();
        selectUsers.CommandText = "SELECT Username FROM BoardUsers;";
        await using (var reader = await selectUsers.ExecuteReaderAsync(cancellationToken))
        {
            while (await reader.ReadAsync(cancellationToken))
            {
                existingUsernames.Add(reader.GetString(0));
            }
        }

        foreach (var username in existingUsernames.Where(username => !configuredUsernames.Contains(username)))
        {
            var deleteUser = connection.CreateCommand();
            deleteUser.CommandText = "DELETE FROM BoardUsers WHERE Username = $username COLLATE NOCASE;";
            deleteUser.Parameters.AddWithValue("$username", username);
            await deleteUser.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    public async Task<BoardUser?> AuthenticateAsync(string username, string password, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Username, PasswordHash, GitHubLogin, TelegramId
            FROM BoardUsers
            WHERE Username = $username COLLATE NOCASE;
            """;
        command.Parameters.AddWithValue("$username", username);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var passwordHash = reader.GetString(2);
        if (!PasswordHasher.Verify(password, passwordHash))
        {
            return null;
        }

        return ReadUser(reader);
    }

    public async Task<BoardUser?> GetUserAsync(int id, CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Username, GitHubLogin, TelegramId
            FROM BoardUsers
            WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$id", id);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? ReadUserWithoutPassword(reader) : null;
    }

    public async Task<IReadOnlyList<BoardUserProfile>> GetProfilesAsync(CancellationToken cancellationToken)
    {
        await using var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, Username, GitHubLogin FROM BoardUsers ORDER BY Username;";

        var users = new List<BoardUserProfile>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            users.Add(new BoardUserProfile(
                reader.GetInt32(0),
                reader.GetString(1),
                reader.IsDBNull(2) ? null : reader.GetString(2)));
        }

        return users;
    }

    private static BoardUser ReadUser(SqliteDataReader reader) => new(
        reader.GetInt32(0),
        reader.GetString(1),
        reader.IsDBNull(3) ? null : reader.GetString(3),
        reader.IsDBNull(4) ? null : reader.GetInt64(4));

    private static BoardUser ReadUserWithoutPassword(SqliteDataReader reader) => new(
        reader.GetInt32(0),
        reader.GetString(1),
        reader.IsDBNull(2) ? null : reader.GetString(2),
        reader.IsDBNull(3) ? null : reader.GetInt64(3));

    private static string CreateConnectionString(IHostEnvironment environment, string databasePath)
    {
        var fullPath = Path.IsPathRooted(databasePath)
            ? databasePath
            : Path.Combine(environment.ContentRootPath, databasePath);
        var directory = Path.GetDirectoryName(fullPath);

        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }

        return new SqliteConnectionStringBuilder { DataSource = fullPath }.ToString();
    }
}

public static class PasswordHasher
{
    private const int Iterations = 100_000;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public static string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, HashSize);
        return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    public static bool Verify(string password, string storedHash)
    {
        var parts = storedHash.Split('.', 3);
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations))
        {
            return false;
        }

        try
        {
            var salt = Convert.FromBase64String(parts[1]);
            var expectedHash = Convert.FromBase64String(parts[2]);
            var actualHash = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);
            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
