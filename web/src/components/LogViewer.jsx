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
    channel_id: null,
    result: null
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
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

  // Helper filters for Cascading Selects
  const getFilteredStations = () => {
    if (!filters.line_id) return masterData.stations;
    return masterData.stations.filter(s => s.line_id === filters.line_id);
  };

  const getFilteredChannels = () => {
    if (!filters.station_id) {
      if (filters.line_id) {
        const lineStations = masterData.stations.filter(s => s.line_id === filters.line_id);
        const stationIds = lineStations.map(s => s.id);
        return masterData.channels.filter(c => stationIds.includes(c.station_id));
      }
      return masterData.channels;
    }
    return masterData.channels.filter(c => c.station_id === filters.station_id);
  };

  const handleLineChange = (val) => {
    setFilters(prev => {
      const nextFilters = { ...prev, line_id: val || null };
      if (!val) return nextFilters;
      if (prev.station_id) {
        const currentStation = masterData.stations.find(s => s.id === prev.station_id);
        if (currentStation && currentStation.line_id !== val) {
          nextFilters.station_id = null;
          nextFilters.channel_id = null;
        }
      }
      return nextFilters;
    });
  };

  const handleStationChange = (val) => {
    setFilters(prev => {
      const nextFilters = { ...prev, station_id: val || null };
      if (!val) return nextFilters;
      const selectedStation = masterData.stations.find(s => s.id === val);
      if (selectedStation) {
        nextFilters.line_id = selectedStation.line_id;
        if (prev.channel_id) {
          const currentChannel = masterData.channels.find(c => c.id === prev.channel_id);
          if (currentChannel && currentChannel.station_id !== val) {
            nextFilters.channel_id = null;
          }
        }
      }
      return nextFilters;
    });
  };

  const handleChannelChange = (val) => {
    setFilters(prev => {
      const nextFilters = { ...prev, channel_id: val || null };
      if (!val) return nextFilters;
      const selectedChannel = masterData.channels.find(c => c.id === val);
      if (selectedChannel) {
        nextFilters.station_id = selectedChannel.station_id;
        const parentStation = masterData.stations.find(s => s.id === selectedChannel.station_id);
        if (parentStation) {
          nextFilters.line_id = parentStation.line_id;
        }
      }
      return nextFilters;
    });
  };

  const fetchLogs = async (page = 1, pageSize = pagination.pageSize) => {
    if (!isServerConnected) return;
    setLoading(true);
    
    const params = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
    };
    if (filters.pid) params.pid = filters.pid;
    if (filters.line_id) params.line_id = filters.line_id;
    if (filters.station_id) params.station_id = filters.station_id;
    if (filters.channel_id) params.channel_id = filters.channel_id;
    if (filters.result) params.result = filters.result;

    const result = await searchLogs(params);
    if (result.success) {
      setLogs(result.data.data || []);
      setPagination(prev => ({ ...prev, current: page, pageSize, total: result.data.total || 0 }));
    } else {
      notification.error({ message: 'Error Fetching Data', description: result.error });
    }
    setLoading(false);
  };

  const handleTableChange = (newPagination) => {
    fetchLogs(newPagination.current, newPagination.pageSize);
  };

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
        fetchMasterData().then(() => fetchLogs(1));
    }
  }, [isServerConnected]);

  const columns = [
    {
      title: 'Start Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text) => <Text style={{ color: '#94a3b8' }}>{new Date(text).toLocaleString()}</Text>,
    },
    {
      title: 'PID',
      dataIndex: 'pid',
      key: 'pid',
      width: 250,
      render: (text) => <Text strong style={{ color: '#e2e8f0', letterSpacing: '0.5px' }}>{text}</Text>,
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
      render: (text) => <Text style={{ color: '#64748b' }}>{text || '-'}</Text>
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
      width: 100,
      render: (result) => (
        <Tag 
          style={{ 
            px: 2, 
            borderRadius: '4px', 
            fontWeight: 'bold',
            color: result === 'OK' ? '#10b981' : '#f43f5e',
            background: result === 'OK' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
            borderColor: result === 'OK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
          }}
        >
          {result}
        </Tag>
      ),
    },
    {
        title: 'Step NG',
        dataIndex: 'step_ng',
        key: 'step_ng',
        render: (text) => text ? (
          <Tag style={{ 
            borderRadius: '4px', 
            color: '#f59e0b', 
            background: 'rgba(245, 158, 11, 0.1)', 
            borderColor: 'rgba(245, 158, 11, 0.2)' 
          }}>
            {text}
          </Tag>
        ) : <Text style={{ color: '#64748b' }}>-</Text>
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
          type="primary" 
          ghost 
          icon={<EyeOutlined />} 
          onClick={() => handleViewDetail(record)}
          size="small"
          style={{ borderColor: '#3b82f6', color: '#3b82f6', borderRadius: '6px' }}
        >
          View
        </Button>
      ),
    }
  ];

  return (
    <div style={{ padding: '12px 24px 24px' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title style={{ margin: 0, color: '#f8fafc', fontWeight: 700, fontSize: '28px' }}>
             Production Data Explorer
          </Title>
          <Text type="secondary" style={{ fontSize: '15px' }}>
             Tra cứu chi tiết và trạng thái Log của hệ thống
          </Text>
        </div>
        <Space wrap align="center">
          {pagination.total > 0 && (
            <Tag color="#3b82f6" style={{ fontSize: '14px', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', margin: 0 }}>
              Total: {pagination.total.toLocaleString()}
            </Tag>
          )}
          <Input 
            prefix={<SearchOutlined style={{ color: '#64748b' }} />} 
            placeholder="Search PID..." 
            style={{ width: 200, borderRadius: '6px', background: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
            value={filters.pid}
            onChange={e => setFilters({...filters, pid: e.target.value})}
            onPressEnter={() => fetchLogs(1)}
          />
          <Select 
            placeholder="Select Line" 
            style={{ width: 140 }} 
            allowClear
            value={filters.line_id}
            onChange={handleLineChange}
          >
            {masterData.lines.map(l => <Option key={l.id} value={l.id}>{l.name}</Option>)}
          </Select>
          <Select 
            placeholder="Select Station" 
            style={{ width: 160 }} 
            allowClear
            showSearch
            optionFilterProp="children"
            value={filters.station_id}
            onChange={handleStationChange}
          >
            {getFilteredStations().map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
          </Select>
          <Select 
            placeholder="Select Channel" 
            style={{ width: 160 }} 
            allowClear
            showSearch
            optionFilterProp="children"
            value={filters.channel_id}
            onChange={handleChannelChange}
          >
            {getFilteredChannels().map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
          </Select>
          <Select 
            placeholder="Result" 
            style={{ width: 100 }} 
            allowClear
            value={filters.result}
            onChange={val => setFilters({...filters, result: val})}
          >
            <Option value="OK">OK</Option>
            <Option value="NG">NG</Option>
          </Select>
          <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchLogs(1)} style={{ borderRadius: '6px', background: '#3b82f6' }}>
            Search
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => setFilters({ pid: '', line_id: null, station_id: null, channel_id: null, result: null })} style={{ borderRadius: '6px', background: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}>
            Reset
          </Button>
        </Space>
      </div>

      <Card 
        style={{ 
          background: '#0f172a', 
          borderColor: '#1e293b', 
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
        }}
        bodyStyle={{ padding: '0' }}
        bordered={false}
      >
        <div style={{ padding: '16px 24px' }}>
          <Table 
            columns={columns} 
            dataSource={logs} 
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} logs`,
            }}
            onChange={handleTableChange}
            rowKey="id"
            size="middle"
            scroll={{ y: 'calc(100vh - 300px)', x: 'max-content' }}
            rowClassName={() => 'dark-table-row'}
          />
        </div>

        <Modal
          title={<span style={{ color: '#f8fafc', fontSize: '18px' }}>Log Details: <Text strong style={{ color: '#3b82f6' }}>{selectedLog?.info?.pid}</Text></span>}
          open={detailVisible}
          onCancel={() => setDetailVisible(false)}
          footer={null}
          width={1000}
          bodyStyle={{ background: '#0f172a', padding: '24px' }}
          className="dark-modal"
        >
          {detailLoading ? (
            <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Loading detailed test steps...</div>
          ) : selectedLog && (
            <div style={{ color: '#cbd5e1' }}>
              <Descriptions 
                title={<span style={{ color: '#e2e8f0' }}>General Information</span>} 
                bordered 
                size="small" 
                column={2}
                labelStyle={{ background: '#1e293b', color: '#94a3b8', fontWeight: 'bold', borderColor: '#334155' }}
                contentStyle={{ background: '#0f172a', color: '#f8fafc', borderColor: '#334155' }}
              >
                <Descriptions.Item label="PID"><Text strong style={{ color: '#f8fafc' }}>{selectedLog.info.pid}</Text></Descriptions.Item>
                <Descriptions.Item label="Result">
                  <Tag 
                    style={{ 
                      fontWeight: 'bold', 
                      borderRadius: '4px',
                      color: selectedLog.info.result === 'OK' ? '#10b981' : '#f43f5e',
                      background: selectedLog.info.result === 'OK' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                      borderColor: selectedLog.info.result === 'OK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
                    }}
                  >
                    {selectedLog.info.result}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Line">{selectedLog.info.line_name}</Descriptions.Item>
                <Descriptions.Item label="Station">{selectedLog.info.station_name}</Descriptions.Item>
                <Descriptions.Item label="Channel">{selectedLog.info.channel_name}</Descriptions.Item>
                <Descriptions.Item label="Start Time">{new Date(selectedLog.info.start_time).toLocaleString()}</Descriptions.Item>
                <Descriptions.Item label="Job File" span={2}><Text code style={{ background: '#1e293b', color: '#cbd5e1' }}>{selectedLog.info.jobfile}</Text></Descriptions.Item>
              </Descriptions>

              <Divider style={{ borderColor: '#334155' }}><span style={{ color: '#94a3b8' }}>Test Steps</span></Divider>
              
              <Table
                size="small"
                dataSource={selectedLog.steps}
                rowKey={(r, i) => i}
                pagination={false}
                columns={[
                  { title: '#', dataIndex: 'step_number', key: 'num', width: 60 },
                  { title: 'Step Name', dataIndex: 'step_name', key: 'name' },
                  { title: 'Value', dataIndex: 'value', key: 'val', render: (val) => <Text style={{ color: '#38bdf8' }}>{val}</Text> },
                  { title: 'Min', dataIndex: 'spec_min', key: 'min', render: (val) => <Text type="secondary">{val}</Text> },
                  { title: 'Max', dataIndex: 'spec_max', key: 'max', render: (val) => <Text type="secondary">{val}</Text> },
                  { 
                    title: 'Result', 
                    dataIndex: 'result', 
                    key: 'res',
                    width: 100,
                    render: (res) => (
                      <Tag 
                        style={{ 
                          borderRadius: '4px',
                          color: res === 'OK' ? '#10b981' : '#f43f5e',
                          background: res === 'OK' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          borderColor: res === 'OK' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)'
                        }}
                      >
                        {res}
                      </Tag>
                    )
                  },
                ]}
              />
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
};

export default LogViewer;
