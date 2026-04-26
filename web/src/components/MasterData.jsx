import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Modal, Form, Input, InputNumber, notification, Tag, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import { getMasterData, saveMasterData, deleteMasterData } from '../services/api';

const { Title, Text } = Typography;

const MasterData = ({ isServerConnected }) => {
  const [entities] = useState([
    { id: 'buyer', name: 'Buyer', icon: '🏢' },
    { id: 'lines', name: 'Line', icon: '🛣️' },
    { id: 'stations', name: 'Station', icon: '📡' },
    { id: 'model_group', name: 'Model Group', icon: '📁' },
    { id: 'channels', name: 'Channel', icon: '📡' },
    { id: 'devices', name: 'Device', icon: '🛠️' },
  ]);

  const [activeEntity, setActiveEntity] = useState('buyer');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

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

  useEffect(() => {
    fetchData();
  }, [activeEntity, isServerConnected]);

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    form.setFieldsValue(record);
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
      const result = await saveMasterData(activeEntity, values);
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

  const columns = data.length > 0 ? Object.keys(data[0]).map(key => ({
    title: key.toUpperCase(),
    dataIndex: key,
    key: key,
    render: (text) => (key === 'id') ? <Text strong>{text}</Text> : text
  })) : [];

  // Thêm cột Actions
  columns.push({
    title: 'ACTIONS',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: (_, record) => (
      <Space size="middle">
        <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        <Button danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
      </Space>
    ),
  });

  return (
    <div className="master-data-antd">
      <Card 
        bordered={false} 
        style={{ marginBottom: 24 }}
        bodyStyle={{ padding: '0 16px' }}
      >
        <Space size="middle" className="master-entity-tabs">
          {entities.map(entity => (
            <div 
              key={entity.id}
              className={`entity-pill ${activeEntity === entity.id ? 'active' : ''}`}
              onClick={() => setActiveEntity(entity.id)}
            >
              {entity.icon} {entity.name}
            </div>
          ))}
        </Space>
      </Card>

      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><DatabaseOutlined /> {entities.find(e => e.id === activeEntity)?.name} Management</span>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Thêm mới
            </Button>
          </div>
        }
        bordered={false}
      >
        <Table 
          columns={columns} 
          dataSource={data.map((item, index) => ({ ...item, key: index }))} 
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

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
          {columns.filter(col => col.key !== 'actions').map(col => (
             <Form.Item
               key={col.key}
               name={col.key}
               label={col.title}
               rules={[{ required: (col.key === 'id' || col.key === 'name'), message: `Vui lòng nhập ${col.title}` }]}
             >
               {col.key === 'id' || col.key.endsWith('_id') ? <InputNumber style={{ width: '100%' }} /> : <Input />}
             </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
};

export default MasterData;
