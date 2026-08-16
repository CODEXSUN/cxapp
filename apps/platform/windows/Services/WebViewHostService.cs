using CXApp.Windows.Bridge;
using CXApp.Windows.Configuration;
using CXApp.Windows.Persistence;
using Microsoft.UI.Xaml.Controls;
using Microsoft.Web.WebView2.Core;
using Windows.System;

namespace CXApp.Windows.Services;

internal sealed class WebViewHostService : IDisposable
{
    private readonly WebView2 webView;
    private readonly WorkspaceStore workspaceStore;
    private bool initialized;

    internal WebViewHostService(WebView2 webView, WorkspaceStore workspaceStore)
    {
        this.webView = webView;
        this.workspaceStore = workspaceStore;
    }

    internal event EventHandler<HostStatus>? StatusChanged;

    internal async Task InitializeAsync()
    {
        if (initialized)
        {
            return;
        }

        StatusChanged?.Invoke(this, HostStatus.Connecting);
        try
        {
            DesktopDiagnostics.Write("Initializing the local workspace database.");
            await workspaceStore.InitializeAsync();
            DesktopDiagnostics.Write("Local workspace database initialized.");
            DesktopDiagnostics.Write("Creating the WebView2 environment.");
            await webView.EnsureCoreWebView2Async();
            DesktopDiagnostics.Write("WebView2 control initialized.");
            ConfigureWebView(webView.CoreWebView2);
            initialized = true;
            webView.Source = DesktopOptions.StartUri;
            DesktopDiagnostics.Write($"Navigating to {DesktopOptions.StartUri}.");
        }
        catch (Exception exception)
        {
            DesktopDiagnostics.Write("Windows host initialization failed.", exception);
            StatusChanged?.Invoke(this, HostStatus.Failed(SafeErrorMessage(exception)));
        }
    }

    internal async Task RetryAsync()
    {
        StatusChanged?.Invoke(this, HostStatus.Connecting);
        if (!initialized)
        {
            await InitializeAsync();
            return;
        }

        webView.Source = DesktopOptions.StartUri;
        webView.Reload();
    }

    public void Dispose()
    {
        if (!initialized)
        {
            return;
        }

        var core = webView.CoreWebView2;
        core.NavigationStarting -= HandleNavigationStarting;
        core.NavigationCompleted -= HandleNavigationCompleted;
        core.NewWindowRequested -= HandleNewWindowRequested;
        core.WebMessageReceived -= HandleWebMessageReceived;
        core.ProcessFailed -= HandleProcessFailed;
        webView.Close();
    }

    private void ConfigureWebView(CoreWebView2 core)
    {
        core.Settings.AreDefaultScriptDialogsEnabled = true;
        core.Settings.AreDevToolsEnabled = System.Diagnostics.Debugger.IsAttached;
        core.Settings.AreHostObjectsAllowed = false;
        core.Settings.IsPasswordAutosaveEnabled = false;
        core.Settings.IsStatusBarEnabled = false;
        core.NavigationStarting += HandleNavigationStarting;
        core.NavigationCompleted += HandleNavigationCompleted;
        core.NewWindowRequested += HandleNewWindowRequested;
        core.WebMessageReceived += HandleWebMessageReceived;
        core.ProcessFailed += HandleProcessFailed;
    }

    private void HandleNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs args)
    {
        StatusChanged?.Invoke(this, HostStatus.Connecting);
        if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) || !DesktopOptions.IsApplicationUri(uri))
        {
            args.Cancel = true;
            _ = OpenExternalHttpsUriAsync(uri);
        }
    }

    private void HandleNavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs args)
    {
        StatusChanged?.Invoke(
            this,
            args.IsSuccess
                ? HostStatus.Ready
                : HostStatus.Failed($"The secure workspace returned {args.WebErrorStatus}. Check the internet connection and retry.")
        );
    }

    private void HandleNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs args)
    {
        args.Handled = true;
        if (!Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri))
        {
            return;
        }

        if (DesktopOptions.IsApplicationUri(uri))
        {
            webView.Source = uri;
            return;
        }

        _ = OpenExternalHttpsUriAsync(uri);
    }

    private async void HandleWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        if (!Uri.TryCreate(args.Source, UriKind.Absolute, out var source)
            || !DesktopOptions.IsApplicationUri(source)
            || !DesktopMessage.TryParse(args.TryGetWebMessageAsString(), out var workspace)
            || workspace is null)
        {
            return;
        }

        try
        {
            await workspaceStore.SaveWorkspaceAsync(workspace);
        }
        catch (Exception exception)
        {
            System.Diagnostics.Debug.WriteLine(exception);
        }
    }

    private void HandleProcessFailed(object? sender, CoreWebView2ProcessFailedEventArgs args)
    {
        StatusChanged?.Invoke(
            this,
            HostStatus.Failed($"The Windows web process stopped ({args.ProcessFailedKind}). Retry to reopen CXApp.")
        );
    }

    private static async Task OpenExternalHttpsUriAsync(Uri? uri)
    {
        if (uri?.Scheme == Uri.UriSchemeHttps)
        {
            await Launcher.LaunchUriAsync(uri);
        }
    }

    private static string SafeErrorMessage(Exception exception)
    {
        return exception is FileNotFoundException
            ? "The Microsoft WebView2 Runtime is not installed. Install it and retry."
            : "The Windows host could not start. Check WebView2 and the network connection, then retry.";
    }
}
