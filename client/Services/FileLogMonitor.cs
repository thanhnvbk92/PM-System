using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using PMSystem.Client.Models;
using Serilog;

namespace PMSystem.Client.Services
{
    /// <summary>
    /// Interface for monitoring log files
    /// </summary>
    public interface IFileLogMonitor
    {
        void StartMonitoring(string filePath, Action<LogEntry> onLogDetected);
        void StopMonitoring();
        List<LogEntry> ReadAllLogs(string filePath);
    }

    /// <summary>
    /// Monitors log files for changes and notifies when new entries are detected
    /// </summary>
    public class FileLogMonitor : IFileLogMonitor, IDisposable
    {
        private FileSystemWatcher? _watcher;
        private long _lastReadPosition = 0;
        private readonly ILogger _logger;

        public FileLogMonitor()
        {
            _logger = Log.ForContext<FileLogMonitor>();
        }

        /// <summary>
        /// Start monitoring a log file for changes
        /// </summary>
        public void StartMonitoring(string filePath, Action<LogEntry> onLogDetected)
        {
            if (!File.Exists(filePath))
            {
                _logger.Error($"Log file not found: {filePath}");
                return;
            }

            var directory = Path.GetDirectoryName(filePath);
            var fileName = Path.GetFileName(filePath);

            _watcher = new FileSystemWatcher(directory)
            {
                Filter = fileName,
                NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.Size
            };

            _watcher.Changed += (sender, e) =>
            {
                OnFileChanged(filePath, onLogDetected);
            };

            _watcher.EnableRaisingEvents = true;
            _logger.Information($"Started monitoring log file: {filePath}");
        }

        /// <summary>
        /// Stop monitoring the log file
        /// </summary>
        public void StopMonitoring()
        {
            _watcher?.Dispose();
            _logger.Information("Stopped monitoring log file");
        }

        /// <summary>
        /// Read all logs from a file (useful for initial load)
        /// </summary>
        public List<LogEntry> ReadAllLogs(string filePath)
        {
            var logs = new List<LogEntry>();

            try
            {
                if (!File.Exists(filePath))
                {
                    _logger.Warning($"Log file not found: {filePath}");
                    return logs;
                }

                var lines = File.ReadAllLines(filePath);
                foreach (var line in lines)
                {
                    var log = ParseLogLine(line, filePath);
                    if (log != null)
                    {
                        logs.Add(log);
                    }
                }

                _logger.Information($"Loaded {logs.Count} log entries from {filePath}");
            }
            catch (Exception ex)
            {
                _logger.Error($"Error reading log file: {ex.Message}");
            }

            return logs;
        }

        private void OnFileChanged(string filePath, Action<LogEntry> onLogDetected)
        {
            try
            {
                // Small delay to ensure file write is complete
                System.Threading.Thread.Sleep(100);

                var newLogs = ReadNewLogs(filePath);
                foreach (var log in newLogs)
                {
                    onLogDetected?.Invoke(log);
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Error processing file change: {ex.Message}");
            }
        }

        private List<LogEntry> ReadNewLogs(string filePath)
        {
            var newLogs = new List<LogEntry>();

            try
            {
                using (var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
                    stream.Seek(_lastReadPosition, SeekOrigin.Begin);

                    using (var reader = new StreamReader(stream))
                    {
                        string? line;
                        while ((line = reader.ReadLine()) != null)
                        {
                            var log = ParseLogLine(line, filePath);
                            if (log != null)
                            {
                                newLogs.Add(log);
                            }
                        }
                    }

                    _lastReadPosition = stream.Position;
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Error reading new logs: {ex.Message}");
            }

            return newLogs;
        }

        private LogEntry? ParseLogLine(string line, string filePath)
        {
            if (string.IsNullOrWhiteSpace(line))
                return null;

            try
            {
                // Simple parser - you can make this more sophisticated
                // Expected format: [timestamp] [level] message
                // Example: [2024-04-26 10:30:00] [INFO] Application started

                var parts = line.Split(new[] { ']' }, StringSplitOptions.None);
                if (parts.Length < 3)
                    return null;

                var timestamp = DateTime.TryParse(parts[0].Trim('[', ' '), out var ts) ? ts : DateTime.Now;
                var level = parts[1].Trim('[', ' ', ']');
                var message = string.Join("]", parts.Skip(2)).Trim();

                return new LogEntry
                {
                    Timestamp = timestamp,
                    Level = level,
                    Message = message,
                    Source = Path.GetFileName(filePath),
                    Host = Environment.MachineName
                };
            }
            catch (Exception ex)
            {
                _logger.Error($"Error parsing log line: {ex.Message}");
                return null;
            }
        }

        public void Dispose()
        {
            _watcher?.Dispose();
        }
    }
}
