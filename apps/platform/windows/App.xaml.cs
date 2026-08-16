using CXApp.Windows.Configuration;
using Microsoft.UI.Xaml;

namespace CXApp.Windows;

public partial class App : Application
{
    private Window? window;

    public App()
    {
        UnhandledException += HandleUnhandledException;
        try
        {
            InitializeComponent();
            DesktopDiagnostics.Write("Application resources initialized.");
        }
        catch (Exception exception)
        {
            DesktopDiagnostics.Write("Application resource initialization failed.", exception);
            throw;
        }
    }

    protected override void OnLaunched(LaunchActivatedEventArgs args)
    {
        try
        {
            DesktopDiagnostics.Write("Creating the main window.");
            window = new MainWindow();
            window.Activate();
            DesktopDiagnostics.Write("Main window activated.");
        }
        catch (Exception exception)
        {
            DesktopDiagnostics.Write("Main window startup failed.", exception);
            throw;
        }
    }

    private static void HandleUnhandledException(object sender, Microsoft.UI.Xaml.UnhandledExceptionEventArgs args)
    {
        DesktopDiagnostics.Write("Unhandled UI exception.", args.Exception);
        System.Diagnostics.Debug.WriteLine(args.Exception);
    }
}
