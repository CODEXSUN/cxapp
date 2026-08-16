using CXApp.Windows.Configuration;
using CXApp.Windows.Persistence;
using CXApp.Windows.Services;
using Microsoft.UI.Windowing;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Media;
using Windows.UI;
using WinRT.Interop;

namespace CXApp.Windows;

public sealed partial class MainWindow : Window
{
    private readonly WebView2 applicationView = new();
    private readonly Grid statusSurface = new();
    private readonly ProgressRing loadingIndicator = new();
    private readonly TextBlock statusTitle = new();
    private readonly TextBlock statusMessage = new();
    private readonly Button retryButton = new();
    private readonly WebViewHostService webViewHost;

    public MainWindow()
    {
        DesktopDiagnostics.Write("Building the main window.");
        BuildContent();
        ConfigureWindow();
        DesktopDiagnostics.Write("Main window size configured.");

        var workspaceStore = new WorkspaceStore();
        webViewHost = new WebViewHostService(applicationView, workspaceStore);
        webViewHost.StatusChanged += HandleStatusChanged;
        applicationView.Loaded += HandleApplicationViewLoaded;
        Closed += HandleClosed;
    }

    private void BuildContent()
    {
        var background = new SolidColorBrush(Color.FromArgb(255, 245, 250, 249));
        var rootLayout = new Grid { Background = background };
        rootLayout.Children.Add(applicationView);
        statusSurface.Background = background;
        statusSurface.Children.Add(CreateStatusStack());
        rootLayout.Children.Add(statusSurface);
        Content = rootLayout;
    }

    private StackPanel CreateStatusStack()
    {
        var stack = new StackPanel
        {
            Width = 420,
            HorizontalAlignment = HorizontalAlignment.Center,
            VerticalAlignment = VerticalAlignment.Center,
            Spacing = 14,
        };
        ConfigureStatusControls();
        stack.Children.Add(loadingIndicator);
        stack.Children.Add(statusTitle);
        stack.Children.Add(statusMessage);
        stack.Children.Add(retryButton);
        return stack;
    }

    private void ConfigureStatusControls()
    {
        loadingIndicator.Width = 34;
        loadingIndicator.Height = 34;
        loadingIndicator.IsActive = true;
        statusTitle.HorizontalAlignment = HorizontalAlignment.Center;
        statusTitle.FontSize = 22;
        statusTitle.FontWeight = Microsoft.UI.Text.FontWeights.SemiBold;
        statusTitle.Text = "Opening CXApp";
        statusMessage.HorizontalAlignment = HorizontalAlignment.Center;
        statusMessage.Text = "Connecting securely to app.codexsun.com...";
        statusMessage.TextAlignment = TextAlignment.Center;
        statusMessage.TextWrapping = TextWrapping.Wrap;
        retryButton.HorizontalAlignment = HorizontalAlignment.Center;
        retryButton.Content = "Retry";
        retryButton.Visibility = Visibility.Collapsed;
        retryButton.Click += RetryButton_Click;
    }

    private void ConfigureWindow()
    {
        var windowHandle = WindowNative.GetWindowHandle(this);
        var windowId = Microsoft.UI.Win32Interop.GetWindowIdFromWindow(windowHandle);
        var appWindow = AppWindow.GetFromWindowId(windowId);
        appWindow.Resize(new global::Windows.Graphics.SizeInt32(1440, 900));
    }

    private async void HandleApplicationViewLoaded(object sender, RoutedEventArgs args)
    {
        applicationView.Loaded -= HandleApplicationViewLoaded;
        await webViewHost.InitializeAsync();
    }

    private void HandleClosed(object sender, WindowEventArgs args)
    {
        webViewHost.Dispose();
    }

    private void HandleStatusChanged(object? sender, HostStatus status)
    {
        statusSurface.Visibility = status.IsReady ? Visibility.Collapsed : Visibility.Visible;
        loadingIndicator.IsActive = status.IsLoading;
        loadingIndicator.Visibility = status.IsLoading ? Visibility.Visible : Visibility.Collapsed;
        retryButton.Visibility = status.CanRetry ? Visibility.Visible : Visibility.Collapsed;
        statusTitle.Text = status.Title;
        statusMessage.Text = status.Message;
    }

    private async void RetryButton_Click(object sender, RoutedEventArgs args)
    {
        await webViewHost.RetryAsync();
    }
}
