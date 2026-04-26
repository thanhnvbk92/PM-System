using System;
using System.Collections.Generic;

namespace PMSystem.Client.Models
{
    /// <summary>
    /// Represents a single log entry to be sent to the server
    /// </summary>
    public class LogEntry
    {
        public DateTime Timestamp { get; set; }
        public string Level { get; set; } = "INFO"; // DEBUG, INFO, WARNING, ERROR, CRITICAL
        public required string Message { get; set; }
        public required string Source { get; set; } // e.g., "Application.log", "System.log"
        public required string Host { get; set; }
        public string? User { get; set; }
        public Dictionary<string, string> CustomFields { get; set; } = new();

        public override string ToString()
        {
            return $"[{Timestamp:yyyy-MM-dd HH:mm:ss}] [{Level}] {Source}@{Host}: {Message}";
        }
    }

    /// <summary>
    /// Represents a batch of log entries to be sent to the server
    /// </summary>
    public class LogBatch
    {
        public List<LogEntry> Logs { get; set; } = new();
    }
}
