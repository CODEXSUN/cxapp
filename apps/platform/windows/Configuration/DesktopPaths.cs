namespace CXApp.Windows.Configuration;

internal static class DesktopPaths
{
    private static readonly string ApplicationDataRoot = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "CXApp",
        "Desktop"
    );

    internal static string WebViewProfile => EnsureDirectory(Path.Combine(ApplicationDataRoot, "WebView2"));

    internal static string WorkspaceDatabase
    {
        get
        {
            EnsureDirectory(ApplicationDataRoot);
            return Path.Combine(ApplicationDataRoot, "workspace.db");
        }
    }

    private static string EnsureDirectory(string path)
    {
        Directory.CreateDirectory(path);
        return path;
    }
}
