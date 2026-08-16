using CXApp.Windows.Persistence;
using CXApp.Windows.Services;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using WinRT.Interop;

namespace CXApp.Windows;

public sealed partial class MainWindow : Window
{
    private readonly WebViewHostService webViewHost;

    public MainWindow()
    {
        InitializeComponent();
        ConfigureWindow();

        var workspaceStore = new WorkspaceStore();
        webViewHost = new WebViewHostService(ApplicationView, workspaceStore);
        webViewHost.StatusChanged += HandleStatusChanged;
        Activated += HandleActivated;
        Closed += HandleClosed;
    }

    private void ConfigureWindow()
    {
        var windowHandle = WindowNative.GetWindowHandle(this);
        var windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle);
        var appWindow = AppWindow.GetFromWindowId(windowId);
        appWindow.Resize(new global::Windows.Graphics.SizeInt32(1440, 900));
    }

    private async void HandleActivated(object sender, WindowActivatedEventArgs args)
    {
        Activated -= HandleActivated;
        await webViewHost.InitializeAsync();
    }

    private void HandleClosed(object sender, WindowEventArgs args)
    {
        webViewHost.Dispose();
    }

    private void HandleStatusChanged(object? sender, HostStatus status)
    {
        StatusSurface.Visibility = status.IsReady ? Visibility.Collapsed : Visibility.Visible;
        LoadingIndicator.IsActive = status.IsLoading;
        LoadingIndicator.Visibility = status.IsLoading ? Visibility.Visible : Visibility.Collapsed;
        RetryButton.Visibility = status.CanRetry ? Visibility.Visible : Visibility.Collapsed;
        StatusTitle.Text = status.Title;
        StatusMessage.Text = status.Message;
    }

    private async void RetryButton_Click(object sender, RoutedEventArgs args)
    {
        await webViewHost.RetryAsync();
    }
}
