import React from 'react';
import './Header.css';

function Header({ isServerConnected, serverStatus }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <h1>📊 PM System</h1>
          <p>Log Collection and Analysis Dashboard</p>
        </div>
        <div className="header-right">
          <div className={`server-status ${isServerConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-indicator"></span>
            <span className="status-text">{serverStatus}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
