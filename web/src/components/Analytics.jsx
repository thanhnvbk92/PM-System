import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Radio, Spin, Empty, message, Button, Tag, DatePicker, Space, Statistic } from 'antd';
import { CloseCircleOutlined, FilterOutlined, CalendarOutlined } from '@ant-design/icons';
const { RangePicker } = DatePicker;
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { getAnalyticsDashboard } from '../services/api';

const { Title, Text } = Typography;

const Analytics = () => {
  const [timeframe, setTimeframe] = useState('7d');
  
  // Cross-filtering states
  const [filters, setFilters] = useState({
    channel: null,
    jobfile: null,
    step_name: null,
    time_label: null
  });

  const [customRange, setCustomRange] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    trend: { time_labels: [], series: [] },
    by_line: [],
    by_station: [],
    by_channel: [],
    by_jobfile: [],
    top_errors: []
  });
  
  const [loadTime, setLoadTime] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe, filters, customRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    const start = performance.now();
    
    let params = { timeframe };
    
    // Ưu tiên custom date range nếu người dùng đã chọn
    if (customRange && customRange[0] && customRange[1]) {
      params.start_date = customRange[0].format('YYYY-MM-DD');
      params.end_date = customRange[1].format('YYYY-MM-DD');
    }
    // Ngược lại, nếu có click vào label thời gian trên biểu đồ
    else if (filters.time_label) {
      const label = filters.time_label;
      // Case: YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
        params.start_date = label;
        params.end_date = label;
      } 
      // Case: YYYY-Wxx (Tuần)
      else if (/^\d{4}-W\d+$/.test(label)) {
        const [year, weekPart] = label.split('-W');
        const weekNum = parseInt(weekPart);
        // Tính toán ngày đầu tuần (Thứ 2)
        const d = new Date(year, 0, 1 + (weekNum - 1) * 7);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
        
        params.start_date = monday.toISOString().split('T')[0];
        params.end_date = sunday.toISOString().split('T')[0];
      }
      // Case: YYYY-MM (Tháng)
      else if (/^\d{4}-\d{2}$/.test(label)) {
        const [year, month] = label.split('-');
        const startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
        
        params.start_date = startDate;
        params.end_date = endDate;
      }
    }

    if (filters.line) params.line = filters.line;
    if (filters.station) params.station = filters.station;
    if (filters.channel) params.channel = filters.channel;
    if (filters.jobfile) params.jobfile = filters.jobfile;
    if (filters.step_name) params.step_name = filters.step_name;


    const res = await getAnalyticsDashboard(params);
    const end = performance.now();
    setLoadTime((end - start).toFixed(0));

    if (res.success) {
      // Merge with default fallback to prevent crashes if backend returns {}
      setDashboardData({
        trend: res.data.trend || { time_labels: [], series: [] },
        by_line: res.data.by_line || [],
        by_station: res.data.by_station || [],
        by_channel: res.data.by_channel || [],
        by_jobfile: res.data.by_jobfile || [],
        top_errors: res.data.top_errors || [],
        summary: res.data.summary || { total_unique: 0, true_errors: 0, true_ng_rate: 0, total_logs: 0, false_calls: 0 }
      });
    } else {
      message.error("Failed to load dashboard data: " + res.error);
    }
    setLoading(false);
  };

  const handleFilterClick = (type, value) => {
    setFilters(prev => ({ ...prev, [type]: prev[type] === value ? null : value }));
  };

  const clearFilters = () => {
    setFilters({ line: null, station: null, channel: null, jobfile: null, step_name: null });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== null);

  // -- Chart Options Generators --

  const getLineChartOptions = (data) => {
    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'cross' },
        formatter: (params) => {
          let res = `${params[0].name}<br/>`;
          params.forEach(p => {
            res += `${p.marker} ${p.seriesName}: <b>${p.value}%</b> (${p.data.count.toLocaleString()})<br/>`;
          });
          return res;
        }
      },
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
        name: 'Rate (%)',
        nameTextStyle: { color: 'rgba(255, 255, 255, 0.45)' },
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.45)',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      legend: {
        show: true,
        textStyle: { color: '#cbd5e1' },
        bottom: 0
      },
      series: data.series ? data.series.map(s => ({
        ...s,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: s.data ? s.data.map((val, idx) => ({
          value: s.rates ? s.rates[idx] : 0,
          count: val
        })) : [],
        itemStyle: { color: s.color || '#3b82f6' },
        label: {
          show: true,
          position: 'top',
          color: 'rgba(255, 255, 255, 0.85)',
          fontSize: 10,
          formatter: (params) => {
            const rate = params.value;
            const count = params.data.count;
            if (rate === 0 && count === 0) return '';
            return `${rate}%`;
          }
        },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: s.color ? `${s.color}66` : 'rgba(59, 130, 246, 0.5)' },
              { offset: 1, color: s.color ? `${s.color}00` : 'rgba(59, 130, 246, 0.0)' }
            ]
          }
        }
      })) : []
    };
  };

  const getBarChartOptions = (dataList, filterType, color = '#10b981') => {
    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>${p.marker} NG Rate: <b>${p.value}%</b> (${p.data.count.toLocaleString()})`;
        }
      },
      grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
      xAxis: {
        type: 'category',
        data: dataList.map(d => d.name),
        axisLabel: { color: 'rgba(255, 255, 255, 0.65)', rotate: 30 },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      yAxis: {
        type: 'value',
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.45)',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      series: [
        {
          type: 'bar',
          data: dataList.map(d => ({
            value: d.rate, // Plot rate
            count: d.value, // Store count
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
              const rate = params.value;
              const count = params.data.count;
              if (rate === 0 && count === 0) return ''; 
              return `${rate}%\n(${count.toLocaleString()})`;
            }
          }
        }
      ]
    };
  };
  
  const getHorizontalBarRateChartOptions = (dataList, filterType, color = '#6366f1') => {
    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>${p.marker} NG Rate: <b>${p.value}%</b> (${p.data.count.toLocaleString()})`;
        }
      },
      grid: { left: '3%', right: '10%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.45)',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'category',
        data: dataList.map(d => d.name),
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.85)', 
          width: 200, 
          overflow: 'breakAll',
          fontSize: 11
        },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          type: 'bar',
          data: dataList.map(d => ({
            value: d.rate,
            count: d.value,
            itemStyle: {
              color: filters[filterType] === d.name ? '#f59e0b' : color,
              opacity: (filters[filterType] && filters[filterType] !== d.name) ? 0.3 : 1
            }
          })),
          borderRadius: [0, 4, 4, 0],
          label: { 
            show: true, 
            position: 'right', 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 10,
            formatter: (params) => {
              const rate = params.value;
              const count = params.data.count;
              if (rate === 0 && count === 0) return '';
              return `${rate}% (${count.toLocaleString()})`;
            }
          }
        }
      ]
    };
  };

  const getHorizontalBarChartOptions = (dataList, filterType, color = '#ef4444') => {
    const total = dataList.reduce((sum, d) => sum + d.value, 0);
    return {
      tooltip: { 
        trigger: 'axis', 
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          return `${p.name}<br/>${p.marker} Errors: <b>${p.data.count.toLocaleString()}</b> (${p.value}%)`;
        }
      },
      grid: { left: '5%', right: '10%', bottom: '5%', top: '5%', containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.45)',
          formatter: '{value}%'
        },
        splitLine: { lineStyle: { color: '#1e293b' } }
      },
      yAxis: {
        type: 'category',
        data: dataList.map(d => d.name),
        axisLabel: { 
          color: 'rgba(255, 255, 255, 0.85)', 
          width: 250, 
          overflow: 'breakAll',
          fontSize: 11
        },
        axisLine: { lineStyle: { color: '#334155' } }
      },
      series: [
        {
          type: 'bar',
          data: dataList.map(d => {
            const percent = total > 0 ? parseFloat(((d.value / total) * 100).toFixed(1)) : 0;
            return {
              value: percent, // Plot calculated percent
              count: d.value, // Store original count
              itemStyle: {
                color: filters[filterType] === d.name ? '#f59e0b' : color, // Highlight selected
                opacity: (filters[filterType] && filters[filterType] !== d.name) ? 0.3 : 1
              }
            };
          }),
          borderRadius: [0, 4, 4, 0],
          label: { 
            show: true, 
            position: 'right', 
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: 11,
            formatter: (params) => {
              return `${params.value}% (${params.data.count.toLocaleString()})`;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Radio.Group 
            value={customRange ? 'custom' : timeframe} 
            onChange={e => {
              if (e.target.value !== 'custom') {
                setCustomRange(null);
                setTimeframe(e.target.value);
              }
            }} 
            buttonStyle="solid"
          >
            <Radio.Button value="7d">7 Days</Radio.Button>
            <Radio.Button value="5w">5 Weeks</Radio.Button>
            <Radio.Button value="12m">12 Months</Radio.Button>
            <Radio.Button value="custom" disabled={!customRange}>Custom</Radio.Button>
          </Radio.Group>

          <RangePicker 
            value={customRange}
            onChange={(dates) => {
              setCustomRange(dates);
              if (dates) {
                setFilters(prev => ({ ...prev, time_label: null })); // Xóa filter click khi chọn range mới
              }
            }}
            placeholder={['Ngày bắt đầu', 'Ngày kết thúc']}
            style={{ borderRadius: '6px', background: '#1e293b', borderColor: '#334155' }}
          />

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

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card bordered={false} className="dark-card" bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>True NG Rate</span>}
              value={dashboardData.summary?.true_ng_rate || 0}
              precision={2}
              suffix="%"
              valueStyle={{ color: '#ef4444', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="dark-card" bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>True NG Count</span>}
              value={dashboardData.summary?.true_errors || 0}
              valueStyle={{ color: '#ef4444' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="dark-card" bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>User OK (False Call)</span>}
              value={dashboardData.summary?.false_calls || 0}
              valueStyle={{ color: '#f59e0b' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card bordered={false} className="dark-card" bodyStyle={{ padding: '16px' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>Total Unique PCB</span>}
              value={dashboardData.summary?.total_unique || 0}
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
      </Row>

      <Spin spinning={loading} size="large">
        <Row gutter={[16, 16]}>
          
          {/* Main Trend Chart */}
          <Col span={24}>
            <Card title="Production Trends (True NG vs User OK)" bordered={false} className="dark-card" bodyStyle={{ height: 350, padding: 0 }}>
              {dashboardData.trend.series.length > 0 ? (
                <ReactECharts 
                  option={getLineChartOptions(dashboardData.trend)} 
                  style={{ height: '350px' }} 
                  onEvents={{
                    click: (params) => {
                      if (params.componentType === 'series') {
                        handleFilterClick('time_label', params.name);
                      }
                    }
                  }}
                />
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

          {/* Job File breakdown */}
          <Col span={24}>
            <Card title="NG by Job File" bordered={false} className="dark-card" bodyStyle={{ height: 350, padding: 0 }}>
              {dashboardData.by_jobfile.length > 0 ? (
                <ReactECharts 
                  option={getHorizontalBarRateChartOptions(dashboardData.by_jobfile, 'jobfile', '#6366f1')} 
                  onEvents={onEvents('jobfile')}
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
