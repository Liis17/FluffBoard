public static class DotEnv
{
    public static void LoadEnvironmentVariables(string path, bool overwriteExisting = false)
    {
        Console.WriteLine($"[startup] .env path: {path}");

        try
        {
            foreach (var line in File.ReadLines(path))
            {
                var trimmedLine = line.Trim();
                if (trimmedLine.Length == 0 || trimmedLine.StartsWith('#'))
                {
                    continue;
                }

                var separatorIndex = trimmedLine.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                var key = trimmedLine[..separatorIndex].Trim();
                var value = trimmedLine[(separatorIndex + 1)..].Trim().Trim('"', '\'');
                Console.WriteLine($"[startup] .env {key}={FormatForLog(key, value)}");

                if (overwriteExisting || string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }
        }
        catch (FileNotFoundException)
        {
            Console.WriteLine("[startup] .env file not found.");
        }
        catch (DirectoryNotFoundException)
        {
            Console.WriteLine("[startup] .env directory not found.");
        }
        catch (UnauthorizedAccessException)
        {
            Console.WriteLine("[startup] Access to the .env file is denied by the operating system.");
        }
    }

    private static string FormatForLog(string key, string value) =>
        key.Contains("token", StringComparison.OrdinalIgnoreCase) ||
        key.Contains("password", StringComparison.OrdinalIgnoreCase)
            ? "<hidden>"
            : value;
}
