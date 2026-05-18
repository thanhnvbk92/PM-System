import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Space, Button, Select, Skeleton, Empty, Switch, Tag, Tabs, Segmented, Typography } from 'antd';
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
  const [trendType, setTrendType] = useState('months');
  const [loadTime, setLoadTime] = useState(null);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const start = performance.now();
    const [sumRes, resultRes, trendRes, channelRes] = await Promise.all([
      getStatsSummary(filters),
      getStatsByResult(filters),
      getProductionTrends(),
      getChannelsStatus()
    ]);
    const end = performance.now();
    setLoadTime((end - start).toFixed(0));

    if (sumRes.success) setSummary(sumRes.data);
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

  // ECharts Options - Premium UI Design
  const resultChartOption = {
    tooltip: { 
      trigger: 'item',
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      padding: 12
    },
    legend: { 
      bottom: '0%', 
      left: 'center', 
      textStyle: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
      icon: 'circle',
      itemGap: 20
    },
    series: [
      {
        name: 'Result Overview',
        type: 'pie',
        radius: ['45%', '65%'], // Reduced to prevent label cutoff
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { 
          borderRadius: 8, 
          borderColor: '#0f172a', 
          borderWidth: 4,
          shadowBlur: 15,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowOffsetY: 5
        },
        label: { 
          show: true, 
          formatter: '{b|{b}}\n{v|{c}}  {p|{d}%}',
          rich: {
            b: { fontSize: 13, color: '#94a3b8', padding: [0, 0, 4, 0] },
            v: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
            p: { fontSize: 13, fontWeight: 'bold', color: '#cbd5e1' }
          }
        },
        labelLine: { 
          show: true, 
          length: 10, 
          length2: 15, 
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' }
        },
        data: resultData.map(d => ({
          name: d.name,
          value: d.value,
          itemStyle: { 
            color: d.name === 'OK' ? 
              { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#34d399' }, { offset: 1, color: '#059669' }] } : 
              { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#fb7185' }, { offset: 1, color: '#e11d48' }] } 
          }
        }))
      }
    ]
  };

  const trendChartOption = {
    tooltip: { 
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#64748b' } },
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      padding: 16
    },
    legend: { 
      data: ['Pass Ratio', 'True NG Rate', 'Total Production'], 
      bottom: 0, 
      textStyle: { color: '#cbd5e1', fontSize: 14, fontWeight: '500' },
      icon: 'roundRect',
      itemGap: 30
    },
    grid: { left: '3%', right: '3%', bottom: '15%', top: '18%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: trends[trendType]?.map(d => d.date) || [],
      axisLine: { lineStyle: { color: '#334155', width: 2 } },
      axisLabel: { color: '#94a3b8', fontSize: 12, margin: 12 },
      axisTick: { show: false },
      boundaryGap: true
    },
    yAxis: [
      { 
        type: 'value',
        name: 'Rate (%)',
        min: 0,
        max: 100,
        splitLine: { show: true, lineStyle: { color: '#1e293b', type: 'dashed' } },
        axisLabel: { formatter: '{value} %', color: '#94a3b8', fontWeight: '500' },
        nameTextStyle: { color: '#94a3b8', padding: [0, 0, 0, 10] },
        axisLine: { show: false }
      },
      { 
        type: 'value',
        name: 'Total Volume',
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8', fontWeight: '500' },
        nameTextStyle: { color: '#94a3b8', padding: [0, 10, 0, 0] },
        axisLine: { show: false }
      }
    ],
    series: [
      {
        name: 'Pass Ratio',
        data: trends[trendType]?.map(d => d.ratio) || [],
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#10b981' },
        lineStyle: { width: 3, color: '#10b981' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(16, 185, 129, 0.2)' }, { offset: 1, color: 'rgba(16, 185, 129, 0)' }]
          }
        }
      },
      {
        name: 'True NG Rate',
        data: trends[trendType]?.map(d => d.true_ng_rate) || [],
        type: 'line',
        yAxisIndex: 0,
        smooth: 0.4,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#ef4444' },
        lineStyle: { width: 3, color: '#ef4444' },
        label: {
            show: true,
            position: 'top',
            formatter: '{c}%',
            color: '#ef4444',
            fontWeight: 'bold'
        }
      },
      {
        name: 'Total Production',
        data: trends[trendType]?.map(d => d.total) || [],
        type: 'line',
        yAxisIndex: 1,
        smooth: 0.4,
        symbol: 'emptyCircle',
        symbolSize: 6,
        itemStyle: { color: '#8b5cf6' },
        lineStyle: { width: 2, type: 'dashed', color: '#8b5cf6' }
      }
    ]
  };

  return (
    <div style={{ padding: '12px 24px 24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Typography.Title style={{ margin: 0, color: '#f8fafc', fontWeight: 700, fontSize: '28px' }}>
            System Dashboard
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '15px' }}>
            Tổng quan tình hình sản xuất và hiệu suất hệ thống
          </Typography.Text>
        </div>
        <Space align="center">
          {loadTime && (
            <Typography.Text type="secondary" style={{ fontSize: '13px', marginRight: '8px' }}>
              Query time: {loadTime}ms
            </Typography.Text>
          )}
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
        <Col xs={24} lg={16}>
          <Card title="Monthly Production Trend" bordered={false}>
            {loading ? <Skeleton active /> : (
              <ReactECharts option={trendChartOption} style={{ height: '350px' }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Result Ratio" bordered={false}>
            {loading ? <Skeleton active /> : (
              <ReactECharts option={resultChartOption} style={{ height: '350px' }} />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
