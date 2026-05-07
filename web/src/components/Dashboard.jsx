import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Space, Button, Select, Skeleton, Empty, Switch, Tag } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ReloadOutlined,
  FilterOutlined,
  DatabaseOutlined,
  BugOutlined,
  UserOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import useStore from '../store/useStore';
import { getStatsSummary, getStatsByBuyer, getStatsByResult } from '../services/api';

const Dashboard = () => {
  const { filters, setFilter, clearFilters } = useStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [buyerData, setBuyerData] = useState([]);
  const [resultData, setResultData] = useState([]);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [sumRes, buyerRes, resultRes] = await Promise.all([
      getStatsSummary(filters),
      getStatsByBuyer(filters),
      getStatsByResult(filters)
    ]);

    if (sumRes.success) setSummary(sumRes.data);
    if (buyerRes.success) setBuyerData(buyerRes.data);
    if (resultRes.success) setResultData(resultRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // WebSocket for Real-time Dashboard updates
  useEffect(() => {
    let socket;
    let throttleTimer;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (protocol === 'ws:' ? '8000' : '');
    const url = `${protocol}//${host}${port ? ':' + port : ''}/ws/logs`;
    
    socket = new WebSocket(url);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'NEW_RESULT') {
        // Throttle: Don't refresh more than once every 5 seconds
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            fetchData(true); // Silent refresh
            throttleTimer = null;
          }, 5000);
        }
      }
    };

    socket.onopen = () => console.log('Dashboard Live Mode Active');

    return () => {
      if (socket) socket.close();
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, []);

  // ECharts Options
  const buyerChartOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'value', boundaryGap: [0, 0.01] },
    yAxis: { type: 'category', data: buyerData.map(d => d.name) },
    series: [
      {
        name: 'Logs',
        type: 'bar',
        data: buyerData.map(d => d.value),
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: '#a855f7' }]
          }
        }
      }
    ]
  };

  const resultChartOption = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%', left: 'center' },
    series: [
      {
        name: 'Result',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10, borderColor: '#1e293b', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: resultData.map(d => ({
          ...d,
          itemStyle: { color: d.name === 'OK' ? '#10b981' : '#ef4444' }
        }))
      }
    ]
  };

  // Handle Chart Clicks for Filtering
  const onBuyerChartClick = (params) => {
    // In a real app, you'd map name to ID. For now, we'll just log and mock
    console.log('Clicked buyer:', params.name);
    // setFilter('buyer_id', ...); 
  };

  return (
    <div className="dashboard-v2">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size="large">
          <h2 style={{ margin: 0, color: '#f8fafc' }}>Production Overview</h2>
          <Select 
            value={filters.time_range} 
            style={{ width: 120 }} 
            onChange={(val) => setFilter('time_range', val)}
            options={[
              { value: '1d', label: 'Last 24h' },
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
            ]}
          />
        </Space>
        <Space>
          <Tag color="cyan">Live Active</Tag>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>Refresh</Button>
          <Button danger onClick={clearFilters}>Clear Filters</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Summary Statistics */}
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card-premium">
            <Statistic
              title="Total Yield"
              value={summary?.total_logs || 0}
              valueStyle={{ color: '#fff' }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card-premium">
            <Statistic
              title="Success Rate"
              value={summary?.success_rate || 0}
              precision={2}
              valueStyle={{ color: (summary?.success_rate > 95 ? '#10b981' : '#f39c12') }}
              prefix={summary?.success_rate > 95 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card-premium">
            <Statistic
              title="Failed Logs (NG)"
              value={summary?.error_logs || 0}
              valueStyle={{ color: '#ef4444' }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="stat-card-premium">
            <Statistic
              title="Distinct Models"
              value={summary?.total_models || 0}
              valueStyle={{ color: '#818cf8' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>

        {/* Charts */}
        <Col xs={24} lg={16}>
          <Card 
            title="Distribution by Buyer" 
            bordered={false} 
            bodyStyle={{ padding: '10px 24px' }}
          >
            {loading ? <Skeleton active /> : (
              <ReactECharts 
                option={buyerChartOption} 
                onEvents={{ 'click': onBuyerChartClick }}
                style={{ height: '400px' }}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Result Ratio" bordered={false}>
            {loading ? <Skeleton active /> : (
              <ReactECharts option={resultChartOption} style={{ height: '400px' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
