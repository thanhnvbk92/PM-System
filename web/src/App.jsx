import React, { useEffect } from 'react';
import { Layout, Menu, theme, ConfigProvider, Space, Badge } from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  UserOutlined,
  BugOutlined
} from '@ant-design/icons';
import useStore from './store/useStore';
import { checkHealth } from './services/api';
import Header from './components/Header.jsx';
import Dashboard from './components/Dashboard.jsx';
import LogViewer from './components/LogViewer.jsx';
import MasterData from './components/MasterData.jsx';
import './App.css';

const { Content, Sider, Footer } = Layout;

function App() {
  const { activeTab, setActiveTab, isSidebarCollapsed, toggleSidebar } = useStore();
  const [isServerConnected, setIsServerConnected] = React.useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const result = await checkHealth();
      setIsServerConnected(result.success);
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'master', icon: <SettingOutlined />, label: 'Master Data' },
    { key: 'logs', icon: <DatabaseOutlined />, label: 'Log Viewer' },
  ];

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#6366f1',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          collapsible
          collapsed={isSidebarCollapsed}
          onCollapse={toggleSidebar}
          width={260}
          theme="dark"
          className="main-sidebar"
        >
          <div className="sidebar-logo">
             <div className="logo-icon">🚀</div>
             {!isSidebarCollapsed && <span className="logo-text">PM System</span>}
          </div>
          
          <Menu
            theme="dark"
            selectedKeys={[activeTab]}
            mode="inline"
            items={menuItems}
            onClick={({ key }) => setActiveTab(key)}
          />

          <div className="sidebar-footer-status">
            <Space>
              <Badge status={isServerConnected ? 'success' : 'error'} />
              {!isSidebarCollapsed && (
                <span className="status-label">
                  {isServerConnected ? 'Cloud Online' : 'Server Offline'}
                </span>
              )}
            </Space>
          </div>
        </Sider>

        <Layout>
          <Header />
          <Content className="main-content-layout">
            <div className="content-inner">
               {activeTab === 'dashboard' && <Dashboard isServerConnected={isServerConnected} />}
               {activeTab === 'master' && <MasterData isServerConnected={isServerConnected} />}
               {activeTab === 'logs' && <LogViewer isServerConnected={isServerConnected} />}
            </div>
          </Content>
          <Footer style={{ textAlign: 'center', opacity: 0.5, fontSize: '12px' }}>
            PM System Analytical Dashboard ©2024 Created for Factory Monitoring
          </Footer>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
