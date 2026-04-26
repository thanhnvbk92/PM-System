import React from 'react';
import './Header.css';

function Header({ isServerConnected, serverStatus }) {
  // Get current page name based on some logic or pass as prop
  // For now, it's just a placeholder for breadcrumbs or title
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-breadcrumbs">
          <span className="breadcrumb-main">Admin</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-active">System Dashboard</span>
        </div>
        
        <div className="header-actions">
           {/* Add user profile or other global actions here */}
           <div className="user-profile">
             <span className="user-name">Thành Nguyễn</span>
             <div className="user-avatar">TN</div>
           </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
