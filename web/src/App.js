import React, { useState, useEffect } from 'react';
import { checkHealth } from './services/api';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LogViewer from './components/LogViewer';
import './App.css';

function App() {
  const [isServerConnected, setIsServerConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [serverStatus, setServerStatus] = useState('Checking...');

  useEffect(() => {
    // Check server health on component mount
    const checkServerHealth = async () => {
      const result = await checkHealth();
      if (result.success) {
        setIsServerConnected(true);
        setServerStatus('Connected ✓');
      } else {
        setIsServerConnected(false);
        setServerStatus('Disconnected ✗');
      }
    };

    checkServerHealth();

    // Check server health every 30 seconds
    const interval = setInterval(checkServerHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <Header isServerConnected={isServerConnected} serverStatus={serverStatus} />

      <div className="container">
        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📋 Log Viewer
          </button>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard isServerConnected={isServerConnected} />}
        {activeTab === 'logs' && <LogViewer isServerConnected={isServerConnected} />}
      </div>

      <footer className="footer">
        <p>PM System © 2024 - Log Collection and Analysis Dashboard</p>
      </footer>
    </div>
  );
}

export default App;
