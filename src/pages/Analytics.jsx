import React, { useState, useEffect } from 'react';
import { ShopVisit } from '@/api/entities';
import { Customer } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { 
  Target,
  TrendingUp,
  Users,
  Star,
  Calendar,
  ArrowUp
} from 'lucide-react';

// Helper to format currency
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(value);

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border">
        <p className="font-bold">{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ color: entry.color }}>
            {`${entry.name}: ${entry.formatter ? entry.formatter(entry.value) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


export default function Analytics() {
  const [visits, setVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(6);

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
        // Failed to fetch analytics data
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


  if (isLoading) {
    return <div className="p-8">Loading analytics...</div>;
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">An overview of your visit and sales performance.</p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <Select value={timeRange.toString()} onValueChange={(val) => setTimeRange(parseInt(val))}>
              <SelectTrigger className="w-48">
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

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <Target className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVisits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Sales / Visit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgSalesPerVisit)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Performance Score</CardTitle>
              <Star className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgPerformanceScore.toFixed(1)}/100</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Visit & Sales Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartableSalesData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Total Sales" stackId="1" stroke="#2E7D32" fill="#81C784" formatter={(val) => formatCurrency(val)} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle>Efficiency Score Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartableSalesData}>
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="avgScore" name="Average Score" stroke="#FF9800" strokeWidth={2} formatter={(val) => val.toFixed(1)} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional Performance</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartableRegionalData}>
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#2E7D32" formatter={(val) => formatCurrency(val)} />
                  <Bar dataKey="visits" name="Visits" fill="#81C784" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Sales Distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie data={chartableProductData} dataKey="sales" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                    {chartableProductData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-1/2 space-y-2">
                {chartableProductData.map((entry, index) => (
                   <div key={entry.name} className="flex items-center justify-between text-sm">
                     <div className="flex items-center">
                       <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                       <span>{entry.name}</span>
                     </div>
                     <span className="font-semibold">{formatCurrency(entry.sales)}</span>
                   </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}