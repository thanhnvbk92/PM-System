import React from 'react';
import { useLocation } from 'react-router-dom';
import { HomeOutlined, DatabaseOutlined, SettingOutlined, BarChartOutlined } from '@ant-design/icons';
import './Header.css';

const PAGE_MAP = {
  '/dashboard': { title: 'System Dashboard', icon: <HomeOutlined /> },
  '/analytics': { title: 'Production Analytics', icon: <BarChartOutlined /> },
  '/master': { title: 'Master Data Management', icon: <SettingOutlined /> },
  '/logs': { title: 'Production Data Explorer', icon: <DatabaseOutlined /> },
};

function Header({ isServerConnected, serverStatus }) {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const pageInfo = PAGE_MAP[currentPath] || { title: 'PM System', icon: <HomeOutlined /> };

  return (
    <header className="header" style={{ background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
      <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 24px' }}>
        
        <div className="header-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Workspace</span>
          <span style={{ color: '#334155', margin: '0 4px' }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontSize: '16px', fontWeight: '600' }}>
            <span style={{ color: '#3b82f6' }}>{pageInfo.icon}</span>
            {pageInfo.title}
          </div>
        </div>
        
        <div className="header-actions">
           <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 12px', background: '#1e293b', borderRadius: '24px', cursor: 'pointer', border: '1px solid #334155' }}>
             <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#fff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
               TN
             </div>
             <span className="user-name" style={{ color: '#e2e8f0', fontWeight: '600', fontSize: '14px' }}>Thành Nguyễn</span>
           </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
