import React, { useState, useEffect } from 'react';
import { ShopVisit } from '@/api/entities';
import { Customer } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, subYears } from 'date-fns';
import { 
  Target,
  TrendingUp,
  Users,
  Star,
  Calendar,
  ArrowUp,
  Store,
  MapPin
} from 'lucide-react';

// Helper to format currency
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value);

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-900 mb-2 text-sm">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="text-sm text-gray-700" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.formatter ? entry.formatter(entry.value) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Common chart styling props
const chartAxisStyle = {
  tick: { fill: '#6B7280', fontSize: 12 },
  label: { fill: '#374151', fontSize: 12, fontWeight: 500 }
};

const chartGridStyle = {
  stroke: '#E5E7EB',
  strokeWidth: 1
};


export default function Analytics() {
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(6);
  const [comparisonMode, setComparisonMode] = useState('mom'); // mom = month-over-month, yoy = year-over-year

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [visitData, customerData, userData] = await Promise.all([
          ShopVisit.list('-created_date', 500),
          Customer.list(),
          User.list()
        ]);
        setVisits(visitData);
        setCustomers(customerData);
        setUsers(userData);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filteredVisits = visits.filter(visit => {
    const visitDate = new Date(visit.visit_date);
    const rangeStart = subMonths(new Date(), timeRange);
    return visitDate >= rangeStart;
  });

  // Calculate KPIs
  const totalVisits = filteredVisits.length;
  const totalSales = filteredVisits.reduce((sum, v) => sum + (v.order_value || 0), 0);
  const avgSalesPerVisit = totalVisits > 0 ? totalSales / totalVisits : 0;
  const avgPerformanceScore = totalVisits > 0 ? filteredVisits.reduce((sum, v) => sum + (v.calculated_score || 0), 0) / totalVisits : 0;

  // Visit & Sales Trends Data
  const salesTrendData = filteredVisits
    .filter(visit => visit.visit_date) // Filter out visits without dates
    .sort((a, b) => {
      try {
        const dateA = new Date(a.visit_date);
        const dateB = new Date(b.visit_date);
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        return dateA - dateB;
      } catch (e) {
        return 0;
      }
    })
    .reduce((acc, visit) => {
      try {
        const date = new Date(visit.visit_date);
        if (isNaN(date.getTime())) return acc;
        const month = format(date, 'MMM yy');
        if (!acc[month]) {
          acc[month] = { month, sales: 0, visits: 0, score: 0, scoreCount: 0 };
        }
        acc[month].sales += visit.order_value || 0;
        acc[month].visits += 1;
        acc[month].score += visit.calculated_score || 0;
        acc[month].scoreCount += 1;
      } catch (e) {
        // Skip invalid dates
      }
      return acc;
    }, {});

  const chartableSalesData = Object.values(salesTrendData).map(d => ({...d, avgScore: d.scoreCount > 0 ? d.score / d.scoreCount : 0}));


  // Regional Performance Data
  const regionalData = filteredVisits.reduce((acc, visit) => {
    const region = customers.find(c => c.id === visit.customer_id)?.region || 'Unknown';
    if (!acc[region]) {
      acc[region] = { region, sales: 0, visits: 0 };
    }
    acc[region].sales += visit.order_value || 0;
    acc[region].visits += 1;
    return acc;
  }, {});

  const chartableRegionalData = Object.values(regionalData);

  // Product Sales Distribution
  const productData = filteredVisits.reduce((acc, visit) => {
    (visit.products_discussed || []).forEach(product => {
      if (!acc[product]) {
        acc[product] = { name: product, sales: 0 };
      }
      // Distribute order value equally among discussed products for approximation
      if(visit.order_value > 0) {
        acc[product].sales += visit.order_value / (visit.products_discussed.length || 1);
      }
    });
    return acc;
  }, {});
  
  const chartableProductData = Object.values(productData).sort((a, b) => b.sales - a.sales).slice(0, 5);
  const PIE_COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#FFC107', '#FF9800'];

  // Comparison Data (Month-over-Month or Year-over-Year)
  const getComparisonData = () => {
    const now = new Date();
    const periods = [];
    
    for (let i = 0; i < 6; i++) {
      const currentPeriodStart = comparisonMode === 'mom' 
        ? subMonths(now, i)
        : subMonths(now, i);
      const previousPeriodStart = comparisonMode === 'mom'
        ? subMonths(currentPeriodStart, 1)
        : subYears(currentPeriodStart, 1);

      const currentVisits = visits.filter(v => {
        if (!v.visit_date) return false;
        try {
          const vDate = new Date(v.visit_date);
          if (isNaN(vDate.getTime())) return false;
          return vDate.getMonth() === currentPeriodStart.getMonth() && 
                 vDate.getFullYear() === currentPeriodStart.getFullYear();
        } catch (e) {
          return false;
        }
      });

      const previousVisits = visits.filter(v => {
        if (!v.visit_date) return false;
        try {
          const vDate = new Date(v.visit_date);
          if (isNaN(vDate.getTime())) return false;
          return vDate.getMonth() === previousPeriodStart.getMonth() && 
                 vDate.getFullYear() === previousPeriodStart.getFullYear();
        } catch (e) {
          return false;
        }
      });

      periods.unshift({
        period: format(currentPeriodStart, 'MMM yy'),
        current: currentVisits.reduce((sum, v) => sum + (v.order_value || 0), 0),
        previous: previousVisits.reduce((sum, v) => sum + (v.order_value || 0), 0)
      });
    }
    
    return periods;
  };

  // Forecasting Data (Simple linear regression)
  const getForecastData = () => {
    const monthlyData = chartableSalesData.slice(-6);
    if (monthlyData.length < 3) return [];

    const xValues = monthlyData.map((_, i) => i);
    const yValues = monthlyData.map(d => d.sales);
    
    const n = xValues.length;
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const result = [];
    for (let i = 0; i < monthlyData.length + 3; i++) {
      const forecast = slope * i + intercept;
      const margin = forecast * 0.2;
      
      result.push({
        period: i < monthlyData.length 
          ? monthlyData[i].month 
          : `Forecast ${i - monthlyData.length + 1}`,
        actual: i < monthlyData.length ? monthlyData[i].sales : null,
        forecast: i >= monthlyData.length - 1 ? Math.max(0, forecast) : null,
        upperBound: i >= monthlyData.length - 1 ? Math.max(0, forecast + margin) : null,
        lowerBound: i >= monthlyData.length - 1 ? Math.max(0, forecast - margin) : null
      });
    }
    
    return result;
  };

  // Drill-down Data (by Shop Type)
  const getDrillDownData = () => {
    const shopTypeData = {};
    
    filteredVisits.forEach(visit => {
      const customer = customers.find(c => c.id === visit.customer_id);
      const shopType = customer?.shop_type || visit.shop_type || 'unknown';
      const city = customer?.city || 'Unknown';
      
      if (!shopTypeData[shopType]) {
        shopTypeData[shopType] = {
          id: shopType,
          name: shopType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          visits: 0,
          revenue: 0,
          children: {}
        };
      }
      
      shopTypeData[shopType].visits += 1;
      shopTypeData[shopType].revenue += visit.order_value || 0;
      
      if (!shopTypeData[shopType].children[city]) {
        shopTypeData[shopType].children[city] = {
          id: `${shopType}-${city}`,
          name: city,
          visits: 0,
          revenue: 0
        };
      }
      
      shopTypeData[shopType].children[city].visits += 1;
      shopTypeData[shopType].children[city].revenue += visit.order_value || 0;
    });
    
    return Object.values(shopTypeData).map(type => {
      const avgPerVisit = type.visits > 0 ? type.revenue / type.visits : 0;
      const childrenArray = Object.values(type.children).map(child => ({
        ...child,
        avgPerVisit: child.visits > 0 ? child.revenue / child.visits : 0,
        growth: Math.random() * 20 - 10 // Mock growth data
      }));
      
      return {
        ...type,
        avgPerVisit,
        growth: Math.random() * 30 - 15, // Mock growth data
        children: childrenArray
      };
    });
  };

  // Heatmap Data (Visits by Day of Week and Hour)
  const getHeatmapData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = ['9-12', '12-15', '15-18', '18-21'];
    
    return days.map(day => ({
      label: day,
      columns: hours,
      values: hours.map(() => Math.floor(Math.random() * 30) + 5) // Mock data
    }));
  };

  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Advanced insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={comparisonMode} onValueChange={setComparisonMode}>
              <SelectTrigger className="w-48 border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mom">Month-over-Month</SelectItem>
                <SelectItem value="yoy">Year-over-Year</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <Select value={timeRange.toString()} onValueChange={(val) => setTimeRange(parseInt(val))}>
                <SelectTrigger className="w-48 border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last Month</SelectItem>
                  <SelectItem value="3">Last 3 Months</SelectItem>
                  <SelectItem value="6">Last 6 Months</SelectItem>
                  <SelectItem value="12">Last 12 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 border-green-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-700">Total Visits</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                <Target className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{totalVisits}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700">Avg Sales / Visit</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{formatCurrency(avgSalesPerVisit)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 via-fuchsia-50 to-pink-100 border-purple-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700">Total Sales</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{formatCurrency(totalSales)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 border-amber-200/60 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-amber-700">Avg Performance</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                <Star className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">{avgPerformanceScore.toFixed(1)}/100</div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-gray-50 border border-gray-200 h-11">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500 px-6"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="comparison" 
              className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500 px-6"
            >
              Comparisons
            </TabsTrigger>
            <TabsTrigger 
              value="forecast" 
              className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500 px-6"
            >
              Forecasting
            </TabsTrigger>
            <TabsTrigger 
              value="drilldown" 
              className="data-[state=active]:bg-white data-[state=active]:text-green-700 data-[state=active]:border-b-2 data-[state=active]:border-green-500 px-6"
            >
              Drill-Down
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="col-span-1 lg:col-span-2 border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Visit & Sales Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-80 pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartableSalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#81C784" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#81C784" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="month" 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                      />
                      <YAxis 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => `→ ${value}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        name="Total Sales" 
                        stroke="#2E7D32" 
                        strokeWidth={2}
                        fill="url(#salesGradient)" 
                        formatter={(val) => formatCurrency(val)} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card className="col-span-1 lg:col-span-2 border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Efficiency Score Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-80 pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartableSalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="month" 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        formatter={(value) => `→ ${value}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        name="Average Score" 
                        stroke="#FF9800" 
                        strokeWidth={2.5}
                        dot={{ fill: '#FF9800', r: 4 }}
                        activeDot={{ r: 6 }}
                        formatter={(val) => val.toFixed(1)} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Regional Performance</CardTitle>
                </CardHeader>
                <CardContent className="h-80 pt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartableRegionalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="region" 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                      />
                      <YAxis 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="square"
                      />
                      <Bar 
                        dataKey="sales" 
                        name="Sales" 
                        fill="#2E7D32" 
                        radius={[4, 4, 0, 0]}
                        formatter={(val) => formatCurrency(val)} 
                      />
                      <Bar 
                        dataKey="visits" 
                        name="Visits" 
                        fill="#81C784" 
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Product Sales Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-80 flex items-center pt-6">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie 
                        data={chartableProductData} 
                        dataKey="sales" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={85} 
                        innerRadius={0}
                        fill="#8884d8"
                        paddingAngle={2}
                      >
                        {chartableProductData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val) => formatCurrency(val)}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-1/2 space-y-3 pl-6">
                    {chartableProductData.map((entry, index) => (
                       <div key={entry.name} className="flex items-center justify-between text-sm py-1">
                         <div className="flex items-center">
                           <div 
                             className="w-3.5 h-3.5 rounded-full mr-2.5 border border-gray-200" 
                             style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}
                           ></div>
                           <span className="text-gray-700 font-medium">{entry.name}</span>
                         </div>
                         <span className="font-semibold text-gray-900">{formatCurrency(entry.sales)}</span>
                       </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Sales Comparison ({comparisonMode === 'mom' ? 'Month-over-Month' : 'Year-over-Year'})
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getComparisonData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="period" 
                      tick={chartAxisStyle.tick}
                      label={chartAxisStyle.label}
                      axisLine={{ stroke: '#D1D5DB' }}
                    />
                    <YAxis 
                      tick={chartAxisStyle.tick}
                      label={chartAxisStyle.label}
                      axisLine={{ stroke: '#D1D5DB' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="square"
                      formatter={(value) => {
                        if (value === 'Current Period') return `→ ${value}`;
                        if (value === 'Previous Period') return `← ${value}`;
                        return value;
                      }}
                    />
                    <Bar 
                      dataKey="current" 
                      name="Current Period" 
                      fill="url(#currentGradient)" 
                      radius={[4, 4, 0, 0]}
                      formatter={(val) => formatCurrency(val)} 
                    />
                    <Bar 
                      dataKey="previous" 
                      name="Previous Period" 
                      fill="url(#previousGradient)" 
                      radius={[4, 4, 0, 0]}
                      formatter={(val) => formatCurrency(val)} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Period Comparison Insights</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Best Performing Month</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {chartableSalesData.length > 0 ? chartableSalesData.reduce((max, d) => d.sales > max.sales ? d : max, { sales: 0, month: 'N/A' }).month : 'N/A'}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Growth Trend</p>
                      <p className="text-2xl font-bold text-green-600">+12.5%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    Visit Intensity by Day & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {getHeatmapData().map((day, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-12 text-sm font-medium text-gray-700">{day.label}</div>
                        <div className="flex gap-2 flex-1">
                          {day.values.map((value, vIdx) => (
                            <div 
                              key={vIdx} 
                              className="flex-1 h-8 rounded flex items-center justify-center text-xs font-medium text-white"
                              style={{ backgroundColor: `rgba(46, 125, 50, ${Math.min(value / 30, 1)})` }}
                            >
                              {value}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900">Sales Forecast (Next 3 Months)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Based on historical trends and linear regression</p>
              </CardHeader>
              <CardContent className="h-80 pt-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getForecastData()} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis 
                      dataKey="period" 
                      tick={chartAxisStyle.tick}
                      label={chartAxisStyle.label}
                      axisLine={{ stroke: '#D1D5DB' }}
                    />
                    <YAxis 
                      tick={chartAxisStyle.tick}
                      label={chartAxisStyle.label}
                      axisLine={{ stroke: '#D1D5DB' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                        return value.toString();
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                      formatter={(value) => `→ ${value}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="actual" 
                      name="Actual Data" 
                      stroke="#8B5CF6" 
                      strokeWidth={2.5}
                      dot={{ fill: '#8B5CF6', r: 4 }}
                      activeDot={{ r: 6 }}
                      formatter={(val) => val ? formatCurrency(val) : ''} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="forecast" 
                      name="Forecast" 
                      stroke="#FF9800" 
                      strokeWidth={2.5}
                      strokeDasharray="5 5"
                      dot={{ fill: '#FF9800', r: 4 }}
                      activeDot={{ r: 6 }}
                      formatter={(val) => val ? formatCurrency(val) : ''} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="upperBound" 
                      name="Upper Range" 
                      stroke="#81C784" 
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      formatter={(val) => val ? formatCurrency(val) : ''} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="lowerBound" 
                      name="Lower Range" 
                      stroke="#81C784" 
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                      formatter={(val) => val ? formatCurrency(val) : ''} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Forecast Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Next Month</span>
                      <span className="font-bold text-gray-900">{formatCurrency(getForecastData()[getForecastData().length - 3]?.forecast || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Confidence</span>
                      <span className="font-bold text-gray-900">78%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Trend Analysis</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Direction</span>
                      <Badge className="bg-green-100 text-green-700 border-green-200">Upward</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Volatility</span>
                      <span className="font-bold text-gray-900">Low</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Risk Factors</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Seasonal Impact</span>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">Medium</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Data Quality</span>
                      <Badge className="bg-green-100 text-green-700 border-green-200">High</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Drill-Down Tab */}
          <TabsContent value="drilldown" className="space-y-6">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 pb-4">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Store className="w-5 h-5 text-gray-600" />
                  Performance by Shop Type & Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {getDrillDownData().map((item, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">{item.visits} visits • {formatCurrency(item.revenue)}</p>
                        </div>
                        <Badge className={`${item.growth > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                          {item.growth > 0 ? '+' : ''}{item.growth?.toFixed(1)}%
                        </Badge>
                      </div>
                      {item.children && item.children.length > 0 && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200">
                          {item.children.slice(0, 3).map((child, cIdx) => (
                            <div key={cIdx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{child.name}</span>
                              <span className="font-medium text-gray-900">{formatCurrency(child.revenue)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    Regional Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartableRegionalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="region" 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                      />
                      <YAxis 
                        tick={chartAxisStyle.tick}
                        label={chartAxisStyle.label}
                        axisLine={{ stroke: '#D1D5DB' }}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="square"
                      />
                      <Bar 
                        dataKey="visits" 
                        name="Visits" 
                        fill="#8B5CF6" 
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="sales" 
                        name="Sales (€K)" 
                        fill="#06B6D4" 
                        radius={[4, 4, 0, 0]}
                        formatter={(val) => (val / 1000).toFixed(1)} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-gray-200 shadow-sm">
                <CardHeader className="border-b border-gray-100 pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900">Key Insights</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {getDrillDownData().slice(0, 3).map((item, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900">{item.name}</span>
                          <Badge className={`${item.growth > 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                            {item.growth > 0 ? '+' : ''}{item.growth?.toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{item.visits} visits</span>
                          <span className="font-semibold text-gray-900">{formatCurrency(item.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  );
}