namespace CXApp.Windows.Configuration;

internal static class DesktopDiagnostics
{
    private const long MaxLogBytes = 1_048_576;
    private static readonly string LogPath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "CXApp",
        "Desktop",
        "startup.log"
    );

    internal static void Write(string message, Exception? exception = null)
    {
        try
        {
            var directory = Path.GetDirectoryName(LogPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            if (File.Exists(LogPath) && new FileInfo(LogPath).Length >= MaxLogBytes)
            {
                File.WriteAllText(LogPath, string.Empty);
            }

            var detail = exception is null ? message : $"{message}{Environment.NewLine}{exception}";
            File.AppendAllText(
                LogPath,
                $"[{DateTimeOffset.UtcNow:O}] {detail}{Environment.NewLine}",
                System.Text.Encoding.UTF8
            );
        }
        catch
        {
            // Diagnostics must never replace the original startup failure.
        }
    }
}
