using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using PMSystem.Client.Models;
using PMSystem.Client.Services;
using Serilog;

namespace PMSystem.Client.ViewModels
{
    /// <summary>
    /// ViewModel for the main application window
    /// </summary>
    public partial class MainViewModel : ObservableObject
    {
        private readonly ILogApiClient _apiClient;
        private readonly IFileLogMonitor _fileMonitor;
        private readonly ILogger _logger;

        [ObservableProperty]
        private string? logFilePath;

        [ObservableProperty]
        private bool isMonitoring = false;

        [ObservableProperty]
        private string statusMessage = "Ready";

        [ObservableProperty]
        private int logCount = 0;

        [ObservableProperty]
        private ObservableCollection<LogEntry> logEntries = new();

        [ObservableProperty]
        private string serverStatus = "Checking...";

        [ObservableProperty]
        private bool isServerConnected = false;

        public MainViewModel(ILogApiClient apiClient, IFileLogMonitor fileMonitor)
        {
            _apiClient = apiClient;
            _fileMonitor = fileMonitor;
            _logger = Log.ForContext<MainViewModel>();

            // Check server health on startup
            _ = CheckServerHealth();
        }

        [RelayCommand]
        public async Task StartMonitoring()
        {
            if (string.IsNullOrEmpty(LogFilePath))
            {
                StatusMessage = "Please select a log file first";
                return;
            }

            try
            {
                // Load existing logs
                var existingLogs = _fileMonitor.ReadAllLogs(LogFilePath);
                foreach (var log in existingLogs)
                {
                    LogEntries.Add(log);
                }

                // Start monitoring for new logs
                _fileMonitor.StartMonitoring(LogFilePath, OnNewLogDetected);
                IsMonitoring = true;
                StatusMessage = "Monitoring started";
                _logger.Information("Started monitoring logs");
            }
            catch (Exception ex)
            {
                StatusMessage = $"Error: {ex.Message}";
                _logger.Error($"Error starting monitoring: {ex.Message}");
            }
        }

        [RelayCommand]
        public void StopMonitoring()
        {
            try
            {
                _fileMonitor.StopMonitoring();
                IsMonitoring = false;
                StatusMessage = "Monitoring stopped";
                _logger.Information("Stopped monitoring logs");
            }
            catch (Exception ex)
            {
                StatusMessage = $"Error: {ex.Message}";
                _logger.Error($"Error stopping monitoring: {ex.Message}");
            }
        }

        [RelayCommand]
        public async Task SendLogsAsync()
        {
            if (LogEntries.Count == 0)
            {
                StatusMessage = "No logs to send";
                return;
            }

            try
            {
                var batch = new LogBatch();
                foreach (var log in LogEntries)
                {
                    batch.Logs.Add(log);
                }

                StatusMessage = "Sending logs...";
                var success = await _apiClient.SendLogsAsync(batch);

                if (success)
                {
                    StatusMessage = $"Successfully sent {batch.Logs.Count} logs";
                    _logger.Information($"Sent {batch.Logs.Count} logs to server");
                }
                else
                {
                    StatusMessage = "Failed to send logs to server";
                }
            }
            catch (Exception ex)
            {
                StatusMessage = $"Error: {ex.Message}";
                _logger.Error($"Error sending logs: {ex.Message}");
            }
        }

        [RelayCommand]
        public async Task CheckServerHealthAsync()
        {
            await CheckServerHealth();
        }

        [RelayCommand]
        public void ClearLogs()
        {
            LogEntries.Clear();
            LogCount = 0;
            StatusMessage = "Logs cleared";
        }

        private void OnNewLogDetected(LogEntry log)
        {
            // Add log to the observable collection (runs on UI thread)
            Application.Current.Dispatcher.Invoke(() =>
            {
                LogEntries.Add(log);
                LogCount = LogEntries.Count;
                StatusMessage = $"New log detected: {log.Level}";
            });
        }

        private async Task CheckServerHealth()
        {
            try
            {
                var isHealthy = await _apiClient.CheckHealthAsync();
                IsServerConnected = isHealthy;
                ServerStatus = isHealthy ? "Connected ✓" : "Disconnected ✗";
            }
            catch (Exception ex)
            {
                IsServerConnected = false;
                ServerStatus = "Error";
                _logger.Error($"Error checking server health: {ex.Message}");
            }
        }
    }
}
