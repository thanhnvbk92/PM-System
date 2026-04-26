using System;
using System.Windows;
using Microsoft.Extensions.DependencyInjection;
using PMSystem.Client.Services;
using PMSystem.Client.ViewModels;
using Serilog;

namespace PMSystem.Client
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        private ServiceProvider? _serviceProvider;

        protected override void OnStartup(StartupEventArgs e)
        {
            // Setup Logging
            Log.Logger = new LoggerConfiguration()
                .MinimumLevel.Debug()
                .WriteTo.Console()
                .WriteTo.File("logs/pm-client-.txt", rollingInterval: RollingInterval.Day)
                .CreateLogger();

            Log.Information("Application starting...");

            // Setup Dependency Injection
            var services = new ServiceCollection();
            ConfigureServices(services);
            _serviceProvider = services.BuildServiceProvider();

            // Get main window from DI container
            var mainWindow = _serviceProvider.GetRequiredService<MainWindow>();
            mainWindow.Show();

            base.OnStartup(e);
        }

        protected override void OnExit(ExitEventArgs e)
        {
            Log.Information("Application closing...");
            Log.CloseAndFlush();
            _serviceProvider?.Dispose();
            base.OnExit(e);
        }

        private void ConfigureServices(ServiceCollection services)
        {
            // Register Services
            services.AddSingleton<ILogApiClient>(new LogApiClient("http://localhost:8000"));
            services.AddSingleton<IFileLogMonitor, FileLogMonitor>();

            // Register ViewModels
            services.AddSingleton<MainViewModel>();

            // Register Views
            services.AddSingleton<MainWindow>();
        }
    }
}
