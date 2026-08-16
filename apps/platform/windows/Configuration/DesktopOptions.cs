namespace CXApp.Windows.Configuration;

internal static class DesktopOptions
{
    internal static readonly Uri ApplicationOrigin = new("https://app.codexsun.com");
    internal static readonly Uri StartUri = new(ApplicationOrigin, "/app/");

    internal static bool IsApplicationUri(Uri uri)
    {
        return uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals(ApplicationOrigin.Host, StringComparison.OrdinalIgnoreCase)
            && uri.Port == 443;
    }
}
