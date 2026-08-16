namespace CXApp.Windows.Services;

internal sealed record HostStatus(
    bool CanRetry,
    bool IsLoading,
    bool IsReady,
    string Message,
    string Title
)
{
    internal static HostStatus Connecting => new(
        false,
        true,
        false,
        "Connecting securely to app.codexsun.com…",
        "Opening CXApp"
    );

    internal static HostStatus Ready => new(false, false, true, string.Empty, string.Empty);

    internal static HostStatus Failed(string message) => new(
        true,
        false,
        false,
        message,
        "CXApp could not connect"
    );
}
