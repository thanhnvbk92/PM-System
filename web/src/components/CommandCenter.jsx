import React, { useState, useEffect } from 'react';
import {
  Layout, Menu, Table, Button, Space, Card, Input, Typography,
  Tag, Tabs, List, Badge, Empty, message, Descriptions,
  Progress, Form, Modal, Select, Tooltip, Divider
} from 'antd';
import {
  MonitorOutlined,
  FileSearchOutlined,
  CloudSyncOutlined,
  ControlOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import { getMasterData, getAgentHealth, sendAgentCommand, getJobStatus, downloadAgentFile } from '../services/api';

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const CommandCenter = () => {
  const [channels, setChannels] = useState([]);
  const [lines, setLines] = useState([]);
  const [modelGroups, setModelGroups] = useState([]);
  const [stations, setStations] = useState([]);
  const [filterLine, setFilterLine] = useState(() => {
    const saved = localStorage.getItem('cc_filterLine');
    return saved ? JSON.parse(saved) : null;
  });
  const [filterModelGroup, setFilterModelGroup] = useState(() => {
    const saved = localStorage.getItem('cc_filterModelGroup');
    return saved ? JSON.parse(saved) : null;
  });
  const [filterStation, setFilterStation] = useState(() => {
    const saved = localStorage.getItem('cc_filterStation');
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState(() => {
    const saved = localStorage.getItem('cc_selectedRowKeys');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Dùng useMemo để tính toán selectedChannels từ channels và selectedRowKeys
  const selectedChannels = React.useMemo(() => {
    return channels.filter(c => selectedRowKeys.map(String).includes(String(c.id)));
  }, [channels, selectedRowKeys]);

  const [loading, setLoading] = useState(false);
  const [healthResults, setHealthResults] = useState({}); // { channelId: data }
  const [searchResults, setSearchResults] = useState({}); // { channelId: files }
  const [activeJobs, setActiveJobs] = useState([]);
  const [searchForm] = Form.useForm();
  const [modelForm] = Form.useForm();

  // Load danh sách dữ liệu khi khởi tạo
  useEffect(() => {
    fetchMetadata();
    const interval = setInterval(updateActiveJobs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    try {
      const [chResp, lineResp, mgResp, stResp] = await Promise.all([
        getMasterData('channels'),
        getMasterData('lines'),
        getMasterData('model_group'),
        getMasterData('stations')
      ]);

      if (chResp.success) setChannels(chResp.data);
      if (lineResp.success) setLines(lineResp.data);
      if (mgResp.success) setModelGroups(mgResp.data);
      if (stResp.success) setStations(stResp.data);
    } catch (error) {
      console.error("Fetch metadata error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Logic lọc phân cấp
  const availableModelGroups = modelGroups.filter(mg => {
    if (!filterLine) return true;
    const stationsInLine = stations.filter(s => s.line_id === filterLine);
    const mgIdsInLine = new Set(stationsInLine.map(s => s.model_group_id));
    return mgIdsInLine.has(mg.id);
  });

  const availableStations = stations.filter(st => {
    const matchLine = !filterLine || st.line_id === filterLine;
    const matchMG = !filterModelGroup || st.model_group_id === filterModelGroup;
    return matchLine && matchMG;
  });

  const filteredChannels = channels.filter(ch => {
    const station = stations.find(s => s.id === ch.station_id);
    if (!station) return false;
    const matchLine = !filterLine || station.line_id === filterLine;
    const matchMG = !filterModelGroup || station.model_group_id === filterModelGroup;
    const matchStation = !filterStation || ch.station_id === filterStation;
    return matchLine && matchMG && matchStation;
  });

  // Lưu trạng thái vào localStorage khi thay đổi
  useEffect(() => {
    localStorage.setItem('cc_filterLine', JSON.stringify(filterLine));
    localStorage.setItem('cc_filterModelGroup', JSON.stringify(filterModelGroup));
    localStorage.setItem('cc_filterStation', JSON.stringify(filterStation));
    localStorage.setItem('cc_selectedRowKeys', JSON.stringify(selectedRowKeys));
  }, [filterLine, filterModelGroup, filterStation, selectedRowKeys]);

  // Tự động fetch health cho các máy mới được chọn
  useEffect(() => {
    selectedChannels.forEach(ch => {
      if (!healthResults[ch.id]) {
        fetchHealth(ch.id);
      }
    });
  }, [selectedChannels]);

  const onSelectChange = (newSelectedRowKeys) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const fetchHealth = async (id) => {
    try {
      const resp = await getAgentHealth(id);
      if (resp.success) {
        setHealthResults(prev => ({ ...prev, [id]: { ...resp.data, status: 'online' } }));
      } else {
        setHealthResults(prev => ({ ...prev, [id]: { status: 'offline', error: resp.error || 'Connection Failed' } }));
      }
    } catch (err) {
      setHealthResults(prev => ({ ...prev, [id]: { status: 'offline', error: 'API Error' } }));
    }
  };

  const updateActiveJobs = async () => {
    if (activeJobs.length === 0) return;

    try {
      const updatedJobs = await Promise.all(activeJobs.map(async (job) => {
        if (job.status === 'completed' || job.status === 'failed') return job;
        const resp = await getJobStatus(job.channelId, job.id);
        if (resp.success) return { ...job, ...resp.data };
        return job;
      }));
      setActiveJobs(updatedJobs);
    } catch (error) {
      console.error("Update jobs error:", error);
    }
  };

  const onSearchFiles = async (values) => {
    if (selectedChannels.length === 0) return;
    setLoading(true);
    let totalFound = 0;

    for (const ch of selectedChannels) {
      try {
        const resp = await sendAgentCommand(ch.id, 'files/search', values);
        if (resp.success) {
          setSearchResults(prev => ({ ...prev, [ch.id]: resp.data.files || [] }));
          totalFound += resp.data.files?.length || 0;
        }
      } catch (err) {
        console.error(`Search files error on machine ${ch.id}:`, err);
      }
    }

    message.success(`Đã quét ${selectedChannels.length} máy, tìm thấy tổng cộng ${totalFound} kết quả`);
    setLoading(false);
  };

  const onDownloadFile = async (channelId, file) => {
    message.loading(`Đang tải file từ máy ${channelId}...`, 0);
    try {
      const resp = await downloadAgentFile(channelId, {
        root_folder: file.parent_path,
        pattern: file.name,
        type: 'file'
      });
      message.destroy();

      if (resp.success) {
        const url = window.URL.createObjectURL(new Blob([resp.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `[CH${channelId}]_${file.name}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        message.error('Tải file thất bại');
      }
    } catch (err) {
      message.destroy();
      message.error('Lỗi kết nối khi tải file');
    }
  };

  const onChangeModel = async (values) => {
    if (selectedChannels.length === 0) return;
    setLoading(true);
    let successCount = 0;

    for (const ch of selectedChannels) {
      try {
        const resp = await sendAgentCommand(ch.id, 'model/change', values);
        if (resp.success) {
          successCount++;
          if (resp.data.job_id) {
            setActiveJobs(prev => [...prev, {
              id: resp.data.job_id,
              channelId: ch.id,
              channelName: ch.name,
              name: `Change Model: ${values.model_name}`,
              status: 'pending'
            }]);
          }
        }
      } catch (err) {
        console.error(`Change model error on machine ${ch.id}:`, err);
      }
    }

    message.success(`Đã gửi lệnh tới ${successCount}/${selectedChannels.length} máy`);
    setLoading(false);
  };

  const onUpdateAgent = async () => {
    if (selectedChannels.length === 0) return;
    Modal.confirm({
      title: `Xác nhận cập nhật ${selectedChannels.length} máy`,
      content: 'Bạn có chắc chắn muốn cập nhật phần mềm trên tất cả các máy trạm đã chọn?',
      onOk: async () => {
        for (const ch of selectedChannels) {
          try {
            const resp = await sendAgentCommand(ch.id, 'update', { force: false });
            if (resp.success && resp.data.job_id) {
              setActiveJobs(prev => [...prev, {
                id: resp.data.job_id,
                channelId: ch.id,
                channelName: ch.name,
                name: 'Update Software',
                status: 'pending'
              }]);
            }
          } catch (err) {
            console.error(`Update agent error on machine ${ch.id}:`, err);
          }
        }
        message.success('Đã gửi lệnh cập nhật hàng loạt');
      }
    });
  };

  const fileColumns = [
    { title: 'Máy', dataIndex: 'channelName', key: 'channelName', width: 100 },
    { title: 'Tên File', dataIndex: 'name', key: 'name' },
    { title: 'Kích thước', dataIndex: 'size_human', key: 'size_human' },
    { title: 'Ngày sửa', dataIndex: 'last_modified', key: 'last_modified' },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<DownloadOutlined />}
          onClick={() => onDownloadFile(record.channelId, record)}
          disabled={record.type === 'folder'}
        >
          Tải về
        </Button>
      )
    },
  ];

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: '#020617' }}>
      <Sider width={400} style={{ background: '#0f172a', padding: '12px', borderRight: '1px solid #1e293b', overflowY: 'auto' }}>
        <Title level={5} style={{ color: '#fff', marginBottom: 12 }}>Bộ lọc & Chọn máy</Title>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: 8 }}>
          <Select 
            placeholder="1. Chọn Line" 
            allowClear
            size="small"
            value={filterLine}
            onChange={(val) => { setFilterLine(val); setFilterModelGroup(null); setFilterStation(null); }}
            options={lines.map(l => ({ label: l.name, value: l.id }))}
          />
          <Select 
            placeholder="2. Chọn Model Group" 
            allowClear
            size="small"
            disabled={!filterLine}
            value={filterModelGroup}
            onChange={(val) => { setFilterModelGroup(val); setFilterStation(null); }}
            options={availableModelGroups.map(mg => ({ label: mg.name, value: mg.id }))}
          />
          <Select 
            placeholder="3. Chọn Station" 
            allowClear
            size="small"
            disabled={!filterModelGroup}
            value={filterStation}
            onChange={(val) => setFilterStation(val)}
            options={availableStations.map(s => ({ label: s.name, value: s.id }))}
          />
        </div>

        {filterStation ? (
          <>
            <Divider style={{ margin: '8px 0', borderColor: '#1e293b' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong style={{ color: '#94a3b8', fontSize: 11 }}>DANH SÁCH MÁY</Text>
              <Button size="small" type="link" onClick={() => onSelectChange(filteredChannels.map(c => c.id))} style={{ fontSize: 11, padding: 0 }}>Chọn tất cả</Button>
            </div>
            <Table
              rowSelection={{
                selectedRowKeys,
                onChange: onSelectChange,
                columnWidth: 30
              }}
              columns={[
                { title: 'Tên máy', dataIndex: 'name', key: 'name', ellipsis: true },
                { title: 'IP', dataIndex: 'ip_address', key: 'ip', width: 110, render: (text) => <Text style={{ fontSize: 11, color: '#64748b' }}>{text}</Text> },
                { 
                  title: 'ST', 
                  key: 'status', 
                  width: 40,
                  render: (_, record) => {
                    const health = healthResults[record.id];
                    const isOnline = health?.status === 'online';
                    return <Badge status={isOnline ? 'success' : health?.status === 'offline' ? 'error' : 'default'} />;
                  }
                }
              ]}
              dataSource={filteredChannels}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 'calc(100vh - 350px)' }}
              style={{ background: 'transparent' }}
              className="dark-table compact-table no-padding-table"
            />
          </>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', border: '1px dashed #1e293b', borderRadius: 8 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>Vui lòng chọn Station để xem máy</Text>
          </div>
        )}
      </Sider>

      <Content style={{ padding: '16px', overflowY: 'auto' }}>
        {selectedChannels.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <Empty description={<span style={{ color: '#64748b' }}>Vui lòng tích chọn máy từ danh sách bên trái để bắt đầu điều khiển</span>} />
          </div>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '12px', borderRadius: 8 }}>
              <div>
                <Title level={5} style={{ margin: 0, color: '#f1f5f9' }}>Điều khiển hàng loạt ({selectedChannels.length} máy)</Title>
                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selectedChannels.map(ch => (
                    <Tag 
                      key={ch.id} 
                      closable 
                      size="small"
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#94a3b8' }}
                      onClose={() => onSelectChange(selectedRowKeys.filter(k => String(k) !== String(ch.id)))}
                    >
                      {ch.name}
                    </Tag>
                  ))}
                </div>
              </div>
              <Space>
                <Button size="small" icon={<ReloadOutlined />} onClick={() => selectedChannels.forEach(ch => fetchHealth(ch.id))}>Làm mới</Button>
                <Button size="small" danger onClick={() => onSelectChange([])}>Bỏ chọn tất cả</Button>
              </Space>
            </div>

            <Tabs 
              defaultActiveKey="1" 
              type="card"
              items={[
                {
                  key: '1',
                  label: <span><MonitorOutlined /> Thông tin</span>,
                  children: (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {selectedChannels.map(ch => {
                        const health = healthResults[ch.id];
                        const isOnline = health?.status === 'online';
                        return (
                          <Card 
                            key={ch.id} 
                            title={<span style={{ fontSize: 13 }}>{ch.name}</span>} 
                            size="small" 
                            bordered={false} 
                            style={{ background: '#0f172a', border: '1px solid #1e293b' }}
                            extra={<Badge status={isOnline ? 'success' : 'error'} text={<small style={{ color: isOnline ? '#4ade80' : '#f87171' }}>{isOnline ? 'Online' : 'Offline'}</small>} />}
                          >
                            {isOnline ? (
                              <Descriptions column={2} size="small">
                                <Descriptions.Item label={<small>OS</small>}>{<small>{health.os?.split(' ')[0]}</small>}</Descriptions.Item>
                                <Descriptions.Item label={<small>Ver</small>}>{<small>{health.version}</small>}</Descriptions.Item>
                                <Descriptions.Item label={<small>CPU</small>} span={2}><Progress percent={health.cpu_usage} size="small" strokeColor="#6366f1" /></Descriptions.Item>
                              </Descriptions>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '4px 0' }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>{health?.error || "Offline"}</Text>
                                <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchHealth(ch.id)} ghost>Thử lại</Button>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  )
                },
                {
                  key: '2',
                  label: <span><FileSearchOutlined /> Quản lý File</span>,
                  children: (
                    <Card title="Tìm kiếm trên tất cả máy đã chọn" bordered={false}>
                      <Form
                        form={searchForm}
                        layout="inline"
                        onFinish={onSearchFiles}
                        initialValues={{ root_folder: 'C:\\Logs', pattern: '*', include_subfolders: true }}
                        style={{ marginBottom: 20 }}
                      >
                        <Form.Item name="root_folder" label="Thư mục" rules={[{ required: true }]}>
                          <Input style={{ width: 250 }} />
                        </Form.Item>
                        <Form.Item name="pattern" label="Mẫu (Regex)">
                          <Input placeholder="*.csv" style={{ width: 150 }} />
                        </Form.Item>
                        <Form.Item>
                          <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading}>
                            Quét hàng loạt
                          </Button>
                        </Form.Item>
                      </Form>

                      <Table
                        dataSource={Object.entries(searchResults).flatMap(([id, files]) =>
                          files.map(f => ({ ...f, channelId: id, channelName: channels.find(c => String(c.id) === String(id))?.name }))
                        )}
                        columns={fileColumns}
                        size="small"
                        pagination={{ pageSize: 10 }}
                        rowKey={(record) => `${record.channelId}-${record.path}`}
                      />
                    </Card>
                  )
                },
                {
                  key: '3',
                  label: <span><ControlOutlined /> Điều khiển</span>,
                  children: (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <Card title="Thay đổi Model (UI Automation)" bordered={false}>
                        <Form form={modelForm} layout="vertical" onFinish={onChangeModel}>
                          <Form.Item name="model_name" label="Tên Model mới" rules={[{ required: true }]}>
                            <Input placeholder="Ví dụ: IPHONE_15_PRO" />
                          </Form.Item>
                          <Button type="primary" icon={<PlayCircleOutlined />} htmlType="submit" block>
                            Thực hiện thay đổi
                          </Button>
                          <Text type="secondary" style={{ fontSize: 12, marginTop: 10, display: 'block' }}>
                            <InfoCircleOutlined /> Lệnh này sẽ tự động thao tác trên phần mềm kiểm tra tại máy trạm.
                          </Text>
                        </Form>
                      </Card>

                      <Card title="Cập nhật phần mềm" bordered={false}>
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <CloudSyncOutlined style={{ fontSize: 48, color: '#6366f1', marginBottom: 20 }} />
                          <p>Cập nhật Agent và các script UI Automation lên phiên bản mới nhất.</p>
                          <Button danger icon={<SafetyCertificateOutlined />} onClick={onUpdateAgent} block>
                            Kiểm tra & Cập nhật
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )
                },
                {
                  key: '4',
                  label: <span><Badge count={activeJobs.filter(j => j.status === 'running').length} offset={[10, 0]}><SyncOutlined /> Tác vụ</Badge></span>,
                  children: (
                    <Card title="Danh sách tác vụ đang chạy" bordered={false}>
                      <List
                        itemLayout="horizontal"
                        dataSource={activeJobs}
                        renderItem={job => (
                          <List.Item>
                            <List.Item.Meta
                              title={<span><Tag color="cyan">{job.channelName}</Tag> {job.name}</span>}
                              description={`ID: ${job.id} | Trạng thái máy: ${job.channelId}`}
                            />
                            <Space>
                              <Tag color={job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'blue'}>
                                {job.status?.toUpperCase() || 'UNKNOWN'}
                              </Tag>
                              {job.status === 'running' && <Progress type="circle" percent={job.progress || 0} width={30} />}
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  )
                }
              ]}
            />
          </Space>
        )}
      </Content>
    </Layout>
  );
};

export default CommandCenter;
