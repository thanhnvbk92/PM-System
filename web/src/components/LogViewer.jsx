import React, { useState, useEffect, useRef } from 'react';
import { Table, Card, Tag, Space, Input, Button, notification, Typography, Select, Modal, Descriptions, Divider, Switch } from 'antd';
import { SearchOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { searchLogs, getLogDetail, getMasterData } from '../services/api';

const { Text, Title } = Typography;
const { Option } = Select;

const LogViewer = ({ isServerConnected }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    pid: '',
    line_id: null,
    station_id: null,
    result: null
  });
  
  const [masterData, setMasterData] = useState({
    lines: [],
    stations: [],
    channels: []
  });

  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const fetchMasterData = async () => {
    const linesRes = await getMasterData('lines');
    const stationsRes = await getMasterData('stations');
    const channelsRes = await getMasterData('channels');
    if (linesRes.success) setMasterData(prev => ({ ...prev, lines: linesRes.data }));
    if (stationsRes.success) setMasterData(prev => ({ ...prev, stations: stationsRes.data }));
    if (channelsRes.success) setMasterData(prev => ({ ...prev, channels: channelsRes.data }));
  };

  const fetchLogs = async () => {
    if (!isServerConnected) return;
    setLoading(true);
    setLogs([]); // Clear old logs immediately when searching
    const result = await searchLogs({ 
        limit: 500,
        pid: filters.pid,
        line_id: filters.line_id,
        station_id: filters.station_id,
        result: filters.result
    });
    if (result.success) {
      setLogs(result.data || []);
    } else {
      notification.error({ message: 'Error Fetching Data', description: result.error });
    }
    setLoading(false);
  };

  // WebSocket for Real-time updates
  useEffect(() => {
    let socket;
    if (isServerConnected) {
      // Determine WebSocket URL based on API_BASE_URL or current location
      const apiBase = import.meta.env.VITE_API_URL || '';
      let url;
      if (apiBase.startsWith('http')) {
        const wsProtocol = apiBase.startsWith('https') ? 'wss:' : 'ws:';
        url = apiBase.replace(/^http(s?):/, wsProtocol) + '/ws/logs';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port ? '8000' : '8000'; // Default to 8000 for backend
        url = `${protocol}//${host}:${port}/ws/logs`;
      }
      
      socket = new WebSocket(url);

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_RESULT') {
          const newRow = { ...message.data };
          const currentFilters = filtersRef.current;
          
          console.log("WebSocket New Result:", newRow.pid, "Current Filter:", currentFilters.pid);

          // Check if new data matches current filters
          if (currentFilters.pid && currentFilters.pid.trim() !== '' && newRow.pid !== currentFilters.pid) {
            console.log("Filtered out WebSocket result:", newRow.pid);
            return;
          }
          if (currentFilters.line_id && newRow.line_id !== currentFilters.line_id) return;
          if (currentFilters.station_id && newRow.station_id !== currentFilters.station_id) return;
          if (currentFilters.result && newRow.result !== currentFilters.result) return;
          
          // Map IDs to Names and IP using masterData for instant display
          const line = masterData.lines.find(l => l.id === newRow.line_id);
          const station = masterData.stations.find(s => s.id === newRow.station_id);
          const channel = masterData.channels.find(c => c.id === newRow.channel_id);
          
          newRow.line_name = line ? line.name : (newRow.line_name || "N/A");
          newRow.station_name = station ? station.name : (newRow.station_name || "N/A");
          newRow.channel_name = channel ? channel.name : (newRow.channel_name || `CH ${newRow.channel_id}`);
          newRow.ip = channel ? channel.ip_address : (newRow.ip || '-');
          newRow.timestamp = newRow.start_time; // For table display

          setLogs(prevLogs => [newRow, ...prevLogs.slice(0, 99)]);
        }
      };

      socket.onopen = () => console.log('WebSocket Connected');
      socket.onclose = () => console.log('WebSocket Disconnected');
    }

    return () => {
      if (socket) socket.close();
    };
  }, [isServerConnected]);

  const handleViewDetail = async (record) => {
    setDetailLoading(true);
    setDetailVisible(true);
    const result = await getLogDetail(record.id);
    if (result.success) {
      setSelectedLog(result.data);
    } else {
      notification.error({ message: 'Error Fetching Detail', description: result.error });
      setDetailVisible(false);
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    if (isServerConnected) {
        fetchMasterData();
        fetchLogs();
    }
  }, [isServerConnected]);

  const columns = [
    {
      title: 'Start Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 170,
      render: (text) => <Text type="secondary">{new Date(text).toLocaleString()}</Text>,
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Line',
      dataIndex: 'line_name',
      key: 'line_name',
    },
    {
      title: 'Station',
      dataIndex: 'station_name',
      key: 'station_name',
    },
    {
      title: 'IP',
      dataIndex: 'ip',
      key: 'ip',
      render: (text) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: 'Channel',
      dataIndex: 'channel_name',
      key: 'channel_name',
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: (result) => (
        <Tag color={result === 'OK' ? 'green' : 'red'}>{result}</Tag>
      ),
    },
    {
        title: 'Step NG',
        dataIndex: 'step_ng',
        key: 'step_ng',
        render: (text) => text ? <Tag color="volcano">{text}</Tag> : '-'
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          icon={<EyeOutlined />} 
          onClick={() => handleViewDetail(record)}
          size="small"
        >
          View
        </Button>
      ),
    }
  ];

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Production Data Explorer</span>
          <Space>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Filter PID..." 
              style={{ width: 200 }}
              value={filters.pid}
              onChange={e => setFilters({...filters, pid: e.target.value})}
              onPressEnter={fetchLogs}
            />
            <Select 
                placeholder="Line" 
                style={{ width: 150 }} 
                allowClear
                onChange={val => setFilters({...filters, line_id: val})}
            >
                {masterData.lines.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}
            </Select>
            <Select 
                placeholder="Result" 
                style={{ width: 100 }} 
                allowClear
                onChange={val => setFilters({...filters, result: val})}
            >
                <Option value="OK">OK</Option>
                <Option value="NG">NG</Option>
            </Select>
            <Button type="primary" icon={<ReloadOutlined />} onClick={fetchLogs}>Filter</Button>
            <Tag color="green" style={{ marginLeft: 8 }}>Always Live</Tag>
          </Space>
        </div>
      }
      bordered={false}
    >
      <Table 
        columns={columns} 
        dataSource={logs} 
        loading={loading}
        pagination={{ pageSize: 15 }}
        rowKey="id"
        size="middle"
      />

      <Modal
        title={`Details for PID: ${selectedLog?.info?.pid || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={1000}
      >
        {detailLoading ? (
          <div style={{ padding: '50px', textAlign: 'center' }}>Loading details...</div>
        ) : selectedLog && (
          <div>
            <Descriptions title="General Info" bordered size="small" column={2}>
              <Descriptions.Item label="PID">{selectedLog.info.pid}</Descriptions.Item>
              <Descriptions.Item label="Result">
                <Tag color={selectedLog.info.result === 'OK' ? 'green' : 'red'}>{selectedLog.info.result}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Line">{selectedLog.info.line_name}</Descriptions.Item>
              <Descriptions.Item label="Station">{selectedLog.info.station_name}</Descriptions.Item>
              <Descriptions.Item label="Channel">{selectedLog.info.channel_name}</Descriptions.Item>
              <Descriptions.Item label="Start Time">{new Date(selectedLog.info.start_time).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Job File" span={2}>{selectedLog.info.jobfile}</Descriptions.Item>
            </Descriptions>

            <Divider orientation="left">Test Steps</Divider>
            
            <Table
              size="small"
              dataSource={selectedLog.steps}
              rowKey={(r, i) => i}
              pagination={false}
              columns={[
                { title: '#', dataIndex: 'step_number', key: 'num' },
                { title: 'Step Name', dataIndex: 'step_name', key: 'name' },
                { title: 'Value', dataIndex: 'value', key: 'val' },
                { title: 'Min', dataIndex: 'spec_min', key: 'min' },
                { title: 'Max', dataIndex: 'spec_max', key: 'max' },
                { 
                  title: 'Result', 
                  dataIndex: 'result', 
                  key: 'res',
                  render: (res) => <Tag color={res === 'OK' ? 'green' : 'red'}>{res}</Tag>
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default LogViewer;
