import React, { useState, useEffect } from 'react';
import { searchLogs } from '../services/api';
import './LogViewer.css';

function LogViewer({ isServerConnected }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    host: '',
    level: '',
    search: '',
    limit: 100,
  });

  const mockLogs = [
    {
      timestamp: '2024-04-26T10:30:00',
      level: 'INFO',
      message: 'Application started successfully',
      source: 'Application.log',
      host: 'CLIENT-01',
    },
    {
      timestamp: '2024-04-26T10:31:15',
      level: 'DEBUG',
      message: 'Database connection established',
      source: 'Application.log',
      host: 'CLIENT-01',
    },
    {
      timestamp: '2024-04-26T10:32:45',
      level: 'ERROR',
      message: 'Failed to connect to external API',
      source: 'System.log',
      host: 'CLIENT-02',
    },
    {
      timestamp: '2024-04-26T10:33:20',
      level: 'WARNING',
      message: 'High memory usage detected',
      source: 'System.log',
      host: 'CLIENT-03',
    },
    {
      timestamp: '2024-04-26T10:34:00',
      level: 'ERROR',
      message: 'Timeout waiting for response',
      source: 'Application.log',
      host: 'CLIENT-02',
    },
  ];

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!isServerConnected) {
      console.error('Server is not connected');
      return;
    }

    setLoading(true);
    // In production, this would call the API
    // const result = await searchLogs(filters);

    // For now, we'll use mock data
    const filtered = mockLogs.filter((log) => {
      if (filters.host && log.host !== filters.host) return false;
      if (filters.level && log.level !== filters.level) return false;
      if (
        filters.search &&
        !log.message.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    setLogs(filtered.slice(0, filters.limit));
    setLoading(false);
  };

  const handleClear = () => {
    setLogs([]);
    setFilters({
      host: '',
      level: '',
      search: '',
      limit: 100,
    });
  };

  const getLevelBadgeClass = (level) => {
    switch (level) {
      case 'ERROR':
      case 'CRITICAL':
        return 'danger';
      case 'WARNING':
        return 'warning';
      case 'INFO':
        return 'info';
      case 'DEBUG':
        return 'info';
      default:
        return 'info';
    }
  };

  if (!isServerConnected) {
    return (
      <div className="log-viewer">
        <div className="error-message">
          ⚠️ Backend server is not connected. Please ensure the server is running at http://localhost:8000
        </div>
      </div>
    );
  }

  return (
    <div className="log-viewer">
      {/* Filter Section */}
      <div className="card">
        <h2>🔍 Search Logs</h2>
        <form onSubmit={handleSearch} className="search-form">
          <div className="filters">
            <div className="filter-group">
              <label htmlFor="host">Host:</label>
              <input
                type="text"
                id="host"
                name="host"
                value={filters.host}
                onChange={handleFilterChange}
                placeholder="e.g., CLIENT-01"
              />
            </div>

            <div className="filter-group">
              <label htmlFor="level">Level:</label>
              <select id="level" name="level" value={filters.level} onChange={handleFilterChange}>
                <option value="">All Levels</option>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="ERROR">ERROR</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div className="filter-group" style={{ flex: 1 }}>
              <label htmlFor="search">Message:</label>
              <input
                type="text"
                id="search"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search message..."
              />
            </div>

            <div className="filter-group">
              <label htmlFor="limit">Limit:</label>
              <input
                type="number"
                id="limit"
                name="limit"
                value={filters.limit}
                onChange={handleFilterChange}
                min="1"
                max="1000"
              />
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">
              🔍 Search
            </button>
            <button type="button" onClick={handleClear} className="btn-secondary">
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="card">
        <h2>📋 Results ({logs.length})</h2>

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        )}

        {!loading && logs.length === 0 ? (
          <p style={{ color: '#7f8c8d', textAlign: 'center', padding: '20px' }}>
            No logs found. Try adjusting your filters.
          </p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Level</th>
                  <th>Host</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td>{log.host}</td>
                    <td>{log.source}</td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LogViewer;
