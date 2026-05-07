import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, InputNumber, notification, Tag, Typography, Select, Tabs, Segmented } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, DatabaseOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { getMasterData, saveMasterData, deleteMasterData, importMasterData } from '../services/api';
import { message } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const MasterData = ({ isServerConnected }) => {
  const [entities] = useState([
    { id: 'buyer', name: 'Buyer', icon: '🏢' },
    { id: 'lines', name: 'Line', icon: '🛣️' },
    { id: 'station_types', name: 'Station Type', icon: '🏷️' },
    { id: 'stations', name: 'Station', icon: '📡' },
    { id: 'model_group', name: 'Model Group', icon: '📁' },
    { id: 'models', name: 'Model Info', icon: '📄' },
    { id: 'channels', name: 'Channel', icon: '📡' },
    { id: 'device_types', name: 'Device Type', icon: '⚙️' },
    { id: 'devices', name: 'Device', icon: '🛠️' },
  ]);

  const [activeEntity, setActiveEntity] = useState('buyer');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [lookups, setLookups] = useState({});
  const [form] = Form.useForm();
  
  // State cho việc lọc Station theo Line trong form Channel
  const [selectedLine, setSelectedLine] = useState(null);

  // Mapping các trường _id sang entity tương ứng để lấy dữ liệu dropdown
  const lookupMap = {
    'line_id': 'lines',
    'buyer_id': 'buyer',
    'model_group_id': 'model_group',
    'station_id': 'stations',
    'station_type_id': 'station_types',
    'channel_id': 'channels',
    'device_type_id': 'device_types'
  };

  const fetchData = async () => {
    if (!isServerConnected) return;
    setLoading(true);
    const result = await getMasterData(activeEntity);
    if (result.success) {
      setData(result.data);
    } else {
      notification.error({ message: 'Error Fetching Data', description: result.error });
    }
    setLoading(false);
  };

  const fetchLookups = async (force = false) => {
    const requiredLookups = [...new Set(Object.values(lookupMap))];
    const newLookups = { ...lookups };

    for (const entity of requiredLookups) {
      if (force || !newLookups[entity]) {
        const result = await getMasterData(entity);
        if (result.success) {
          newLookups[entity] = result.data;
        }
      }
    }
    setLookups(newLookups);
  };

  useEffect(() => {
    fetchData();
    fetchLookups(); // Tải lookups ngay để hiển thị tên thay vì ID trong bảng
  }, [activeEntity, isServerConnected]);

  const handleAdd = async () => {
    setEditingItem(null);
    setSelectedLine(null);
    form.resetFields();
    await fetchLookups(true); // Đợi làm mới dữ liệu dropdown
    setIsModalVisible(true);
  };

  const handleEdit = async (record) => {
    setEditingItem(record);
    await fetchLookups(true); // Đợi làm mới dữ liệu dropdown
    
    // Nếu là channel, tìm line_id tương ứng của station_id để set vào state lọc
    if (activeEntity === 'channels' && record.station_id && lookups.stations) {
      const station = lookups.stations.find(s => s.id === record.station_id);
      if (station) {
        setSelectedLine(station.line_id);
        form.setFieldsValue({ ...record, line_id: station.line_id });
      } else {
        form.setFieldsValue(record);
      }
    } else {
      form.setFieldsValue(record);
    }
    
    setIsModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa bản ghi này khỏi ${activeEntity}?`,
      okText: 'Xóa',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        const result = await deleteMasterData(activeEntity, id);
        if (result.success) {
          notification.success({ message: 'Đã xóa thành công' });
          fetchData();
        } else {
          notification.error({ message: 'Lỗi khi xóa', description: result.error });
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      // Đảm bảo gửi kèm ID khi edit để Backend nhận diện đúng
      const payload = editingItem ? { ...values, id: editingItem.id } : values;
      
      const result = await saveMasterData(activeEntity, payload);
      if (result.success) {
        notification.success({ message: 'Đã lưu thành công' });
        setIsModalVisible(false);
        fetchData();
      } else {
        notification.error({ message: 'Lỗi khi lưu', description: result.error });
      }
    } catch (err) {
      console.log('Validate Failed:', err);
    }
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) {
      notification.warning({ message: 'Không có dữ liệu để xuất' });
      return;
    }

    const sample = data[0];
    const headers = Object.keys(sample).filter(k => k !== 'key').join(",");
    
    const csvRows = data.map(row => {
      return Object.keys(sample)
        .filter(k => k !== 'key')
        .map(key => {
          const val = row[key] === null || row[key] === undefined ? "" : row[key];
          const escaped = ('' + val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",");
    });

    const csvContent = [headers, ...csvRows].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8' });
    const fileName = `${activeEntity}_export_${new Date().toLocaleDateString('en-CA')}.csv`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
    
    notification.success({ message: `Đã xuất file thành công: ${fileName}` });
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split("\n").map(row => row.trim()).filter(row => row);
      if (rows.length < 2) {
        notification.error({ message: 'File CSV trống hoặc sai định dạng' });
        return;
      }
      const headers = rows[0].split(",").map(h => h.replace(/"/g, ''));
      const items = rows.slice(1).map(row => {
        const values = row.split(",").map(v => v.replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i]; });
        return obj;
      });
      setLoading(true);
      const res = await importMasterData(activeEntity, items);
      if (res.success) {
        notification.success({ message: `Đã nhập thành công ${res.data.count} bản ghi` });
        fetchData();
      } else {
        notification.error({ message: 'Lỗi khi nhập dữ liệu', description: res.error });
      }
      setLoading(false);
      e.target.value = null;
    };
    reader.readAsText(file);
  };

  const columns = data.length > 0 ? Object.keys(data[0]).map(key => {
    let width = 120;
    if (key === 'id') width = 60;
    else if (key === 'name') width = 180;
    else if (key === 'remark') width = 200;
    else if (key.endsWith('_id')) width = 140;

    return {
      title: key.toUpperCase(),
      dataIndex: key,
      key: key,
      width: width,
      ellipsis: true,
      render: (text) => {
        if (key === 'id') return <Text strong style={{ color: '#1890ff' }}>{text}</Text>;
        
        const entityLookup = lookupMap[key];
        if (entityLookup && lookups[entityLookup]) {
          const found = lookups[entityLookup].find(item => item.id === text);
          return found ? (
            <Tag color="processing" style={{ borderRadius: 4, padding: '0 6px', fontSize: '12px' }}>
              {found.name}
            </Tag>
          ) : (
            <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '11px' }}>ID: {text}</Text>
          );
        }
        return <span title={text}>{text}</span>;
      }
    };
  }) : [];

  columns.push({
    title: 'ACTION',
    key: 'actions',
    fixed: 'right',
    width: 80,
    render: (_, record) => (
      <Space size={4}>
        <Button size="small" type="text" icon={<EditOutlined style={{ color: '#1890ff', fontSize: '14px' }} />} onClick={() => handleEdit(record)} />
        <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: '14px' }} />} onClick={() => handleDelete(record.id)} />
      </Space>
    ),
  });

  return (
    <div className="master-data-container" style={{ padding: '0 16px 16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#fff' }}>Master Data Management</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>Quản lý cấu hình hệ thống và dữ liệu danh mục</Text>
        </div>
        <Space size={8}>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportCSV}
            style={{ borderRadius: 8, height: 38 }}
          >
            Xuất CSV
          </Button>
          <Button 
            icon={<UploadOutlined />} 
            onClick={() => document.getElementById('csvImportInput').click()}
            style={{ borderRadius: 8, height: 38 }}
          >
            Nhập CSV
          </Button>
          <input 
            type="file" 
            id="csvImportInput" 
            style={{ display: 'none' }} 
            accept=".csv" 
            onChange={handleImportCSV} 
          />
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={{ borderRadius: 8, height: 38, padding: '0 15px' }}
          >
            Thêm mới
          </Button>
        </Space>
      </div>

      <Card 
        bordered={false} 
        className="glass-card"
        style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(10px)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.2)'
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <Tabs 
          activeKey={activeEntity} 
          onChange={setActiveEntity}
          type="line"
          size="middle"
          className="master-tabs"
          items={entities.map(entity => ({
            key: entity.id,
            label: (
              <span style={{ fontSize: 13, padding: '0 4px' }}>
                {entity.icon} {entity.name}
              </span>
            ),
          }))}
          style={{ marginBottom: 16 }}
        />

        <Table 
          columns={columns} 
          dataSource={data.map((item, index) => ({ ...item, key: item.id || index }))} 
          loading={loading}
          size="small"
          pagination={{ 
            pageSize: 15,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} bản ghi`
          }}
          scroll={{ y: 550 }}
          className="custom-table"
          rowClassName={(record, index) => index % 2 === 0 ? 'even-row' : 'odd-row'}
        />
      </Card>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-table .ant-table-thead > tr > th {
          background: rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.85) !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: rgba(255, 255, 255, 0.65) !important;
        }
        .custom-table .ant-table-tbody > tr:hover > td {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        .even-row { background: rgba(255, 255, 255, 0.01); }
        .odd-row { background: transparent; }
        
        /* Ẩn thanh cuộn ngang mặc định của trình duyệt và dùng của Antd */
        .ant-table-header { background: transparent !important; }
      `}} />

      <Modal
        title={`${editingItem ? 'Chỉnh sửa' : 'Thêm mới'} ${entities.find(e => e.id === activeEntity)?.name}`}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText="Lưu dữ liệu"
        cancelText="Hủy bỏ"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          {/* Trường hợp đặc biệt: Channel cần lọc Station theo Line */}
          {activeEntity === 'channels' && (
            <Form.Item
              name="line_id"
              label="LINE"
              rules={[{ required: true, message: 'Vui lòng chọn Line' }]}
            >
              <Select
                placeholder="Chọn Line trước"
                onChange={(val) => {
                  setSelectedLine(val);
                  form.setFieldsValue({ station_id: undefined }); // Reset station khi đổi line
                }}
              >
                {lookups.lines?.map(line => (
                  <Option key={line.id} value={line.id}>{line.name}</Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {columns.filter(col => col.key !== 'actions').map(col => {
            // Ẩn trường ID khi thêm mới
            if (col.key === 'id' && !editingItem) return null;
            
            // Trường station_id trong bảng channels sẽ được xử lý đặc biệt (lọc theo line)
            const isLookupField = lookupMap[col.key];

            return (
              <Form.Item
                key={col.key}
                name={col.key}
                label={col.title}
                rules={[{
                  required: col.key !== 'id' && (col.key === 'name' || col.key.endsWith('_id')),
                  message: `Vui lòng nhập ${col.title}`
                }]}
              >
                {isLookupField ? (
                  <Select
                    placeholder={`Chọn ${col.title}`}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    disabled={col.key === 'station_id' && activeEntity === 'channels' && !selectedLine}
                  >
                    {/* Nếu là bảng channel và là trường station_id, lọc theo selectedLine */}
                    {(col.key === 'station_id' && activeEntity === 'channels' && selectedLine)
                      ? lookups.stations?.filter(s => s.line_id === selectedLine).map(item => (
                          <Option key={item.id} value={item.id}>{item.name}</Option>
                        ))
                      : lookups[isLookupField]?.map(item => (
                          <Option key={item.id} value={item.id}>{item.name}</Option>
                        ))
                    }
                  </Select>
                ) : (
                  col.key === 'id' || col.key.endsWith('_id') ?
                    <InputNumber style={{ width: '100%' }} disabled={col.key === 'id'} /> :
                    <Input />
                )}
              </Form.Item>
            );
          })}
        </Form>
      </Modal>
    </div>
  );
};

export default MasterData;
