import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Space, Input, Button, notification, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { searchLogs } from '../services/api';

const { Text } = Typography;

const LogViewer = ({ isServerConnected }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchLogs = async () => {
    if (!isServerConnected) return;
    setLoading(true);
    const result = await searchLogs({ limit: 100 });
    if (result.success) {
      setLogs(result.data || []);
    } else {
      notification.error({ message: 'Error Fetching Logs', description: result.error });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [isServerConnected]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => <Text type="secondary">{new Date(text).toLocaleString()}</Text>,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level) => {
        let color = 'blue';
        if (level === 'ERROR' || level === 'CRITICAL') color = 'red';
        if (level === 'WARNING') color = 'orange';
        return <Tag color={color}>{level}</Tag>;
      },
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
       title: 'Location',
       key: 'location',
       render: (_, record) => (
         <Space>
           <Tag>L:{record.line_id}</Tag>
           <Tag>S:{record.station_id}</Tag>
         </Space>
       )
    }
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📋 System Log Viewer</span>
          <Space>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Search in logs..." 
              style={{ width: 300 }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchLogs}>Refresh</Button>
          </Space>
        </div>
      }
      bordered={false}
    >
      <Table 
        columns={columns} 
        dataSource={logs.filter(l => l.message.toLowerCase().includes(searchText.toLowerCase()))} 
        loading={loading}
        pagination={{ pageSize: 15 }}
        rowKey={(record, index) => index}
        size="middle"
      />
    </Card>
  );
};

export default LogViewer;
