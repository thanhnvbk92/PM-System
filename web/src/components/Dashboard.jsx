import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Space, Button, Select, Skeleton, Empty, Switch, Tag, Tabs, Segmented } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  ReloadOutlined,
  FilterOutlined,
  DatabaseOutlined,
  BugOutlined,
  UserOutlined,
  ApiOutlined,
  DisconnectOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import useStore from '../store/useStore';
import { 
  getStatsSummary, getStatsByBuyer, getStatsByResult, 
  getProductionTrends, getChannelsStatus 
} from '../services/api';

const Dashboard = () => {
  const { filters, setFilter, clearFilters } = useStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [buyerData, setBuyerData] = useState([]);
  const [resultData, setResultData] = useState([]);
  const [trends, setTrends] = useState({ months: [], weeks: [], days: [] });
  const [channelStatus, setChannelStatus] = useState({ total: 0, online: 0, offline: 0 });
  const [trendType, setTrendType] = useState('days');

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [sumRes, buyerRes, resultRes, trendRes, channelRes] = await Promise.all([
      getStatsSummary(filters),
      getStatsByBuyer(filters),
      getStatsByResult(filters),
      getProductionTrends(),
      getChannelsStatus()
    ]);

    if (sumRes.success) setSummary(sumRes.data);
    if (buyerRes.success) setBuyerData(buyerRes.data);
    if (resultRes.success) setResultData(resultRes.data);
    if (trendRes.success) setTrends(trendRes.data);
    if (channelRes.success) setChannelStatus(channelRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  // WebSocket for Real-time Dashboard updates
  useEffect(() => {
    let socket;
    let throttleTimer;

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
        itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: '20', fontWeight: 'bold' } },
        labelLine: { show: false },
        data: resultData.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { color: d.name === 'OK' ? '#22c55e' : '#ef4444' }
        }))
      }
    ]
  };

  const trendChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: { 
      type: 'category', 
      data: trends[trendType].map(d => d.date)
    },
    yAxis: { type: 'value' },
    series: [{
      data: trends[trendType].map(d => d.value),
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: '#6366f1' }, { offset: 1, color: 'rgba(99, 102, 241, 0)' }]
        }
      },
      itemStyle: { color: '#6366f1' },
      lineStyle: { width: 3 }
    }]
  };

  // Handle Chart Clicks for Filtering
  const onBuyerChartClick = (params) => {
    // In a real app, you'd map name to ID. For now, we'll just log and mock
    console.log('Clicked buyer:', params.name);
    // setFilter('buyer_id', ...); 
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Production Dashboard</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchData()}>Refresh</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Total Logs"
              value={summary?.total_logs}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#6366f1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Success Rate"
              value={summary?.success_rate}
              precision={2}
              suffix="%"
              prefix={<ArrowUpOutlined />}
              valueStyle={{ color: '#22c55e' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="NG Records"
              value={summary?.error_logs}
              prefix={<BugOutlined />}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="glass-card">
            <Statistic
              title="Disconnected Channels"
              value={channelStatus.offline}
              suffix={`/ ${channelStatus.total}`}
              prefix={<DisconnectOutlined />}
              valueStyle={{ color: channelStatus.offline > 0 ? '#f59e0b' : '#6366f1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card 
            title="Production Trend" 
            extra={
              <Segmented 
                options={[
                  { label: '7 Days', value: 'days' },
                  { label: '5 Weeks', value: 'weeks' },
                  { label: '12 Months', value: 'months' }
                ]} 
                value={trendType}
                onChange={setTrendType}
              />
            }
          >
            {loading ? <Skeleton active /> : <ReactECharts option={trendChartOption} style={{ height: 350 }} />}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Distribution by Buyer" bordered={false}>
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
