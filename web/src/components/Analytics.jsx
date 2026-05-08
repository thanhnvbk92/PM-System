import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Radio, Spin, Empty, message, Button, Tag } from 'antd';
import { CloseCircleOutlined, FilterOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getAnalyticsDashboard } from '../services/api';

const { Title, Text } = Typography;

const Analytics = () => {
  const [timeframe, setTimeframe] = useState('7d');
  
  // Cross-filtering states
  const [filters, setFilters] = useState({
    line: null,
    station: null,
    channel: null,
    step_name: null
  });

  const [dashboardData, setDashboardData] = useState({
    trend: { time_labels: [], series: [] },
    by_line: [],
    by_station: [],
    by_channel: [],
    top_errors: []
  });
  
  const [loadTime, setLoadTime] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe, filters]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const start = performance.now();
    const params = { timeframe };
    if (filters.line) params.line = filters.line;
    if (filters.station) params.station = filters.station;
    if (filters.channel) params.channel = filters.channel;
    if (filters.step_name) params.step_name = filters.step_name;

    const res = await getAnalyticsDashboard(params);
    const end = performance.now();
    setLoadTime((end - start).toFixed(0));

    if (res.success) {
      setDashboardData(res.data);
    } else {
      message.error("Failed to load dashboard data: " + res.error);
    }
    setLoading(false);
  };

  const handleFilterClick = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? null : value }));
  };

  const clearFilters = () => {
    setFilters({ line: null, station: null, channel: null, step_name: null });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  // -- Chart Options Generators --

  const getLineChartOptions = (data) => {
    const total = data.series && data.series[0] ? data.series[0].data.reduce((sum, val) => sum + val, 0) : 0;
    
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.time_labels || [],
        axisLabel: { color: 'rgba(255, 255, 255, 0.45)' },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.45)' },
        axisLabel: { color: 'rgba(255, 255, 255, 0.45)' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: data.series ? data.series.map(s => ({
        ...s,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#3b82f6' },
        label: {
          show: false // Hidden on line chart to prevent clutter, users can hover to see tooltip
        },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.5)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
            ]
          }
        }
      })) : []
    };
  };

  const getBarChartOptions = (dataList, filterType, color = '#10b981') => {
    const total = dataList.reduce((sum, d) => sum + d.value, 0);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dataList.map(d => d.name),
        axisLabel: { color: 'rgba(255, 255, 255, 0.65)', rotate: 30 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255, 255, 255, 0.45)' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          type: 'bar',
          data: dataList.map(d => ({
            value: d.value,
            rate: d.rate,
            itemStyle: {
              color: filters[filterType] === d.name ? '#f59e0b' : color, // Highlight selected
              opacity: (filters[filterType] && filters[filterType] !== d.name) ? 0.3 : 1
            }
          })),
          borderRadius: [4, 4, 0, 0],
          label: {
            show: true,
            position: 'top',
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 10,
            formatter: (params) => {
              const val = params.value;
              const rate = params.data.rate;
              if (rate === 0 && val === 0) return ''; 
              return `${rate}%\n(${val.toLocaleString()})`;
            }
          }
        }
      ]
    };
  };

  const getHorizontalBarChartOptions = (dataList, filterType, color = '#ef4444') => {
    const total = dataList.reduce((sum, d) => sum + d.value, 0);
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: '3%', right: '15%', bottom: '3%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(255, 255, 255, 0.45)' },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'category',
        data: dataList.map(d => d.name),
        axisLabel: { color: 'rgba(255, 255, 255, 0.85)', width: 120, overflow: 'truncate' },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          type: 'bar',
          data: dataList.map(d => ({
            value: d.value,
            itemStyle: {
              color: filters[filterType] === d.name ? '#f59e0b' : color, // Highlight selected
              opacity: (filters[filterType] && filters[filterType] !== d.name) ? 0.3 : 1
            }
          })),
          borderRadius: [0, 4, 4, 0],
          label: { 
            show: true, 
            position: 'right', 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 11,
            formatter: (params) => {
              const val = params.value;
              const percent = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return `${percent}% (${val.toLocaleString()})`;
            }
          }
        }
      ]
    };
  };

  // Events
  const onEvents = (type) => ({
    click: (e) => {
      if (e.name) {
        handleFilterClick(type, e.name);
      }
    }
  });

  return (
    <div style={{ padding: '0 24px 24px 24px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Controls */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Radio.Group value={timeframe} onChange={e => setTimeframe(e.target.value)} buttonStyle="solid">
            <Radio.Button value="7d">7 Days</Radio.Button>
            <Radio.Button value="5w">5 Weeks</Radio.Button>
            <Radio.Button value="12m">12 Months</Radio.Button>
          </Radio.Group>

          {loadTime && (
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Query time: {loadTime}ms
            </Text>
          )}
          
          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '16px' }}>
              <FilterOutlined style={{ color: '#f59e0b' }} />
              {Object.entries(filters).map(([k, v]) => v && (
                <Tag key={k} color="orange" closable onClose={() => handleFilterClick(k, v)}>
                  {k}: {v}
                </Tag>
              ))}
              <Button type="link" size="small" danger onClick={clearFilters}>Clear All</Button>
            </div>
          )}
        </div>
      </div>

      <Spin spinning={loading} size="large">
        <Row gutter={[16, 16]}>
          
          {/* Main Trend Chart */}
          <Col span={24}>
            <Card title="Trend Over Time" bordered={false} className="dark-card" bodyStyle={{ height: 300, padding: 0 }}>
              {dashboardData.trend.series.length > 0 ? (
                <ReactECharts option={getLineChartOptions(dashboardData.trend)} style={{ height: '100%' }} />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>

          {/* Line, Station, Channel breakdown */}
          <Col span={8}>
            <Card title="NG by Line" bordered={false} className="dark-card" bodyStyle={{ height: 250, padding: 0 }}>
              {dashboardData.by_line.length > 0 ? (
                <ReactECharts 
                  option={getBarChartOptions(dashboardData.by_line, 'line', '#8b5cf6')} 
                  onEvents={onEvents('line')}
                  style={{ height: '100%' }} 
                />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="NG by Station" bordered={false} className="dark-card" bodyStyle={{ height: 250, padding: 0 }}>
              {dashboardData.by_station.length > 0 ? (
                <ReactECharts 
                  option={getBarChartOptions(dashboardData.by_station, 'station', '#06b6d4')} 
                  onEvents={onEvents('station')}
                  style={{ height: '100%' }} 
                />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>

          <Col span={8}>
            <Card title="NG by Channel" bordered={false} className="dark-card" bodyStyle={{ height: 250, padding: 0 }}>
              {dashboardData.by_channel.length > 0 ? (
                <ReactECharts 
                  option={getBarChartOptions(dashboardData.by_channel, 'channel', '#14b8a6')} 
                  onEvents={onEvents('channel')}
                  style={{ height: '100%' }} 
                />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>

          {/* Top Errors */}
          <Col span={24}>
            <Card title="Top Frequent Errors" bordered={false} className="dark-card" bodyStyle={{ height: 350, padding: 0 }}>
              {dashboardData.top_errors.length > 0 ? (
                <ReactECharts 
                  option={getHorizontalBarChartOptions(dashboardData.top_errors, 'step_name', '#ef4444')} 
                  onEvents={onEvents('step_name')}
                  style={{ height: '100%' }} 
                />
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            </Card>
          </Col>

        </Row>
      </Spin>
    </div>
  );
};

export default Analytics;
