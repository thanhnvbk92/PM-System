using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using PMSystem.Client.Models;
using Serilog;

namespace PMSystem.Client.Services
{
    /// <summary>
    /// HTTP client for communicating with the backend server
    /// </summary>
    public interface ILogApiClient
    {
        Task<bool> SendLogsAsync(LogBatch batch);
        Task<bool> CheckHealthAsync();
    }

    public class LogApiClient : ILogApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger _logger;
        private readonly string _baseUrl;

        public LogApiClient(string serverUrl = "http://localhost:8000")
        {
            _baseUrl = serverUrl;
            _httpClient = new HttpClient();
            _logger = Log.ForContext<LogApiClient>();
        }

        /// <summary>
        /// Send a batch of log entries to the backend server
        /// </summary>
        public async Task<bool> SendLogsAsync(LogBatch batch)
        {
            if (batch?.Logs == null || batch.Logs.Count == 0)
            {
                _logger.Warning("Attempted to send empty log batch");
                return false;
            }

            try
            {
                var url = $"{_baseUrl}/api/logs/ingest";
                var response = await _httpClient.PostAsJsonAsync(url, batch);

                if (response.IsSuccessStatusCode)
                {
                    _logger.Information($"Successfully sent {batch.Logs.Count} log entries to server");
                    return true;
                }
                else
                {
                    _logger.Error($"Failed to send logs. Status: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Exception while sending logs: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Check if the backend server is healthy
        /// </summary>
        public async Task<bool> CheckHealthAsync()
        {
            try
            {
                var url = $"{_baseUrl}/health";
                var response = await _httpClient.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    _logger.Information("Backend server is healthy");
                    return true;
                }
                else
                {
                    _logger.Warning($"Backend server returned status: {response.StatusCode}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.Error($"Cannot reach backend server: {ex.Message}");
                return false;
            }
        }
    }
}
