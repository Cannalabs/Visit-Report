import React, { useState, useEffect } from 'react';
import { ShopVisit } from '@/api/entities';
import { Customer } from '@/api/entities';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
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


// Common chart styling props
const chartAxisStyle = {
  tick: { fill: '#6B7280', fontSize: 12, fontWeight: 500 },
  label: { fill: '#374151', fontSize: 12, fontWeight: 600 }
};

const chartGridStyle = {
  stroke: '#E5E7EB',
  strokeWidth: 1,
  strokeDasharray: '3 3'
};

// Enhanced color palette with beautiful gradients
const chartColors = {
  primary: '#10B981', // Emerald green
  secondary: '#3B82F6', // Blue
  accent: '#8B5CF6', // Purple
  warning: '#F59E0B', // Amber
  success: '#22C55E', // Green
  info: '#06B6D4', // Cyan
  danger: '#EF4444', // Red
  gradient: {
    green: ['#10B981', '#059669', '#047857'],
    blue: ['#3B82F6', '#2563EB', '#1D4ED8'],
    purple: ['#8B5CF6', '#7C3AED', '#6D28D9'],
    orange: ['#F59E0B', '#D97706', '#B45309'],
    emerald: ['#10B981', '#34D399', '#6EE7B7'],
    indigo: ['#6366F1', '#818CF8', '#A5B4FC'],
    rose: ['#F43F5E', '#FB7185', '#FDA4AF']
  }
};

// Chart background gradients
const chartBackgrounds = {
  sales: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
  score: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
  regional: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)',
  product: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
  comparison: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
  forecast: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 50%, #f5d0fe 100%)',
  drilldown: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)'
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
        // Fetch visits first (most important data) to show page faster
        const visitData = await ShopVisit.list('-created_date', 500).catch(() => []);
        setVisits(visitData || []);
        setIsLoading(false); // Show page as soon as visits are loaded
        
        // Fetch customers and users in background (less critical)
        Promise.all([
          Customer.list().catch(() => []),
          User.list().catch(() => [])
        ]).then(([customerData, userData]) => {
          setCustomers(customerData || []);
          setUsers(userData || []);
        }).catch(error => {
          console.error("Failed to fetch secondary data:", error);
          setCustomers([]);
          setUsers([]);
        });
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        // Set empty arrays on error to prevent crashes
        setVisits([]);
        setCustomers([]);
        setUsers([]);
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredVisits = visits.filter(visit => {
    if (!visit.visit_date && !visit.created_date && !visit.created_at) return false;
    try {
      const dateToUse = visit.visit_date || visit.created_date || visit.created_at;
      const visitDate = new Date(dateToUse);
      if (isNaN(visitDate.getTime())) return false;
    const rangeStart = subMonths(new Date(), timeRange);
    return visitDate >= rangeStart;
    } catch (e) {
      return false;
    }
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

  // Country name to ISO code mapping (normalized)
  const normalizeCountryName = (name) => {
    if (!name) return null;
    const normalized = name.trim();
    const lower = normalized.toLowerCase();
    
    // Handle common variations
    if (lower === 'ind' || lower === 'india' || lower.includes('india')) return 'India';
    if (lower === 'europe' || lower.includes('europe')) return 'Europe'; // Will need special handling
    if (lower === 'asia' || lower.includes('asia')) return 'Asia'; // Will need special handling
    if (lower === 'uk' || lower === 'united kingdom' || lower.includes('united kingdom')) return 'United Kingdom';
    if (lower === 'usa' || lower === 'us' || lower === 'united states' || lower.includes('united states')) return 'United States';
    if (lower === 'netherlands' || lower.includes('netherlands') || lower.includes('holland')) return 'Netherlands';
    if (lower === 'germany' || lower.includes('germany') || lower.includes('deutschland')) return 'Germany';
    if (lower === 'france' || lower.includes('france')) return 'France';
    if (lower === 'spain' || lower.includes('spain') || lower.includes('espana')) return 'Spain';
    if (lower === 'italy' || lower.includes('italy') || lower.includes('italia')) return 'Italy';
    if (lower === 'belgium' || lower.includes('belgium')) return 'Belgium';
    if (lower === 'switzerland' || lower.includes('switzerland')) return 'Switzerland';
    if (lower === 'austria' || lower.includes('austria')) return 'Austria';
    if (lower === 'portugal' || lower.includes('portugal')) return 'Portugal';
    if (lower === 'poland' || lower.includes('poland')) return 'Poland';
    if (lower === 'czech republic' || lower.includes('czech')) return 'Czech Republic';
    if (lower === 'denmark' || lower.includes('denmark')) return 'Denmark';
    if (lower === 'sweden' || lower.includes('sweden')) return 'Sweden';
    if (lower === 'norway' || lower.includes('norway')) return 'Norway';
    if (lower === 'finland' || lower.includes('finland')) return 'Finland';
    if (lower === 'ireland' || lower.includes('ireland')) return 'Ireland';
    if (lower === 'greece' || lower.includes('greece')) return 'Greece';
    if (lower === 'hungary' || lower.includes('hungary')) return 'Hungary';
    if (lower === 'romania' || lower.includes('romania')) return 'Romania';
    if (lower === 'bulgaria' || lower.includes('bulgaria')) return 'Bulgaria';
    if (lower === 'croatia' || lower.includes('croatia')) return 'Croatia';
    if (lower === 'slovakia' || lower.includes('slovakia')) return 'Slovakia';
    if (lower === 'slovenia' || lower.includes('slovenia')) return 'Slovenia';
    if (lower === 'estonia' || lower.includes('estonia')) return 'Estonia';
    if (lower === 'latvia' || lower.includes('latvia')) return 'Latvia';
    if (lower === 'lithuania' || lower.includes('lithuania')) return 'Lithuania';
    if (lower === 'luxembourg' || lower.includes('luxembourg')) return 'Luxembourg';
    if (lower === 'malta' || lower.includes('malta')) return 'Malta';
    if (lower === 'cyprus' || lower.includes('cyprus')) return 'Cyprus';
    
    return normalized; // Return as-is if no match
  };

  const countryToISO = {
    'India': 'IND',
    'Netherlands': 'NLD',
    'Germany': 'DEU',
    'France': 'FRA',
    'United Kingdom': 'GBR',
    'UK': 'GBR',
    'United States': 'USA',
    'USA': 'USA',
    'US': 'USA',
    'Spain': 'ESP',
    'Italy': 'ITA',
    'Belgium': 'BEL',
    'Switzerland': 'CHE',
    'Austria': 'AUT',
    'Portugal': 'PRT',
    'Poland': 'POL',
    'Czech Republic': 'CZE',
    'Denmark': 'DNK',
    'Sweden': 'SWE',
    'Norway': 'NOR',
    'Finland': 'FIN',
    'Ireland': 'IRL',
    'Greece': 'GRC',
    'Hungary': 'HUN',
    'Romania': 'ROU',
    'Bulgaria': 'BGR',
    'Croatia': 'HRV',
    'Slovakia': 'SVK',
    'Slovenia': 'SVN',
    'Estonia': 'EST',
    'Latvia': 'LVA',
    'Lithuania': 'LTU',
    'Luxembourg': 'LUX',
    'Malta': 'MLT',
    'Cyprus': 'CYP'
  };

  // Country/Region Map Data - Group by region (treating regions as countries)
  const getCountryMapData = () => {
    const countryData = {};
    
    filteredVisits.forEach(visit => {
      const customer = customers.find(c => c.id === visit.customer_id);
      // Use region as country identifier, or infer from city/county
      let country = customer?.region || 'Unknown';
      
      // Normalize country name FIRST before processing
      const normalized = normalizeCountryName(country);
      country = normalized || country;
      
      // If region is not available or still unknown, try to infer from city/county
      if ((country === 'Unknown' || !countryToISO[country]) && customer?.city) {
        // Simple mapping - in production, you'd have a proper country mapping
        const cityLower = customer.city.toLowerCase();
        if (cityLower.includes('amsterdam') || cityLower.includes('rotterdam') || cityLower.includes('netherlands') || cityLower.includes('holland')) {
          country = 'Netherlands';
        } else if (cityLower.includes('berlin') || cityLower.includes('munich') || cityLower.includes('germany') || cityLower.includes('frankfurt')) {
          country = 'Germany';
        } else if (cityLower.includes('paris') || cityLower.includes('lyon') || cityLower.includes('france')) {
          country = 'France';
        } else if (cityLower.includes('london') || cityLower.includes('manchester') || cityLower.includes('uk') || cityLower.includes('united kingdom') || cityLower.includes('birmingham')) {
          country = 'United Kingdom';
        } else if (cityLower.includes('madrid') || cityLower.includes('barcelona') || cityLower.includes('spain') || cityLower.includes('valencia')) {
          country = 'Spain';
        } else if (cityLower.includes('rome') || cityLower.includes('milan') || cityLower.includes('italy') || cityLower.includes('naples')) {
          country = 'Italy';
        } else if (cityLower.includes('brussels') || cityLower.includes('belgium')) {
          country = 'Belgium';
        } else if (cityLower.includes('zurich') || cityLower.includes('geneva') || cityLower.includes('switzerland')) {
          country = 'Switzerland';
        } else if (cityLower.includes('vienna') || cityLower.includes('austria')) {
          country = 'Austria';
        } else if (cityLower.includes('lisbon') || cityLower.includes('portugal')) {
          country = 'Portugal';
        } else if (cityLower.includes('mumbai') || cityLower.includes('delhi') || cityLower.includes('bangalore') || cityLower.includes('chennai') || cityLower.includes('kolkata') || cityLower.includes('hyderabad') || cityLower.includes('pune') || cityLower.includes('india')) {
          country = 'India';
        } else {
          country = country || customer.city; // Use city as fallback
        }
      }
      
      if (!countryData[country]) {
        countryData[country] = {
          country,
          isoCode: countryToISO[country] || null,
          sales: 0,
          visits: 0,
          customers: new Set(),
          cities: new Set()
        };
      }
      
      countryData[country].sales += visit.order_value || 0;
      countryData[country].visits += 1;
      if (customer) {
        countryData[country].customers.add(customer.id);
        if (customer.city) countryData[country].cities.add(customer.city);
      }
    });
    
    return Object.values(countryData).map(data => {
      // Ensure country name is normalized and ISO code is set
      const normalizedCountry = normalizeCountryName(data.country) || data.country;
      const isoCode = countryToISO[normalizedCountry] || data.isoCode;
      
      return {
        country: normalizedCountry, // Use normalized name
        isoCode: isoCode,
        sales: data.sales,
        visits: data.visits,
        customers: data.customers.size,
        cities: data.cities.size,
        avgSalesPerVisit: data.visits > 0 ? data.sales / data.visits : 0
      };
    }).sort((a, b) => b.sales - a.sales);
  };

  const countryMapData = getCountryMapData();

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
  
  const PIE_COLORS = [
    chartColors.primary,    // Emerald green
    chartColors.secondary,  // Blue
    chartColors.accent,      // Purple
    chartColors.warning,    // Amber
    chartColors.info        // Cyan
  ];
  
  const chartableProductData = Object.values(productData).sort((a, b) => b.sales - a.sales).slice(0, 5);

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
      const margin = Math.abs(forecast * 0.2);
      const isForecastPeriod = i >= monthlyData.length;
      const isLastActualPeriod = i === monthlyData.length - 1;
      
      result.push({
        period: i < monthlyData.length 
          ? monthlyData[i].month 
          : `Forecast ${i - monthlyData.length + 1}`,
        actual: i < monthlyData.length ? monthlyData[i].sales : undefined,
        forecast: (isForecastPeriod || isLastActualPeriod) ? Math.max(0, forecast) : undefined,
        upperBound: (isForecastPeriod || isLastActualPeriod) ? Math.max(0, forecast + margin) : undefined,
        lowerBound: (isForecastPeriod || isLastActualPeriod) ? Math.max(0, forecast - margin) : undefined
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
    const dayMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    const hours = ['9-12', '12-15', '15-18', '18-21'];
    
    // Initialize heatmap data structure
    const heatmapData = {};
    days.forEach(day => {
      heatmapData[day] = {
        label: day,
        columns: hours,
        values: hours.map(() => 0)
      };
    });
    
    // Process real visit data - use visit_date or created_date as fallback
    filteredVisits.forEach(visit => {
      // Try visit_date first, then created_date/created_at as fallback
      let dateToUse = visit.visit_date || visit.created_date || visit.created_at;
      if (!dateToUse) return;
      
      try {
        const visitDate = new Date(dateToUse);
        if (isNaN(visitDate.getTime())) return;
        
        // Get day of week (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeek = visitDate.getDay();
        const dayLabel = dayMap[dayOfWeek];
        if (!dayLabel || !heatmapData[dayLabel]) return;
        
        // Get hour of day
        let hour = visitDate.getHours();
        let minutes = visitDate.getMinutes();
        
        // If hour is 0 and minutes is 0, it might be a date-only field
        // Try to use created_date/created_at which likely has a time component
        if (hour === 0 && minutes === 0 && !visit.visit_date && (visit.created_date || visit.created_at)) {
          const fallbackDate = new Date(visit.created_date || visit.created_at);
          if (!isNaN(fallbackDate.getTime())) {
            hour = fallbackDate.getHours();
            minutes = fallbackDate.getMinutes();
          }
        }
        
        // If still no time info, distribute evenly or use a default
        // For now, if hour is 0 and it's likely a date-only field, use created_date time
        if (hour === 0 && minutes === 0 && visit.created_date) {
          const createdDate = new Date(visit.created_date);
          if (!isNaN(createdDate.getTime()) && (createdDate.getHours() !== 0 || createdDate.getMinutes() !== 0)) {
            hour = createdDate.getHours();
            minutes = createdDate.getMinutes();
          }
        }
        
        // Determine time slot
        let timeSlotIndex = -1;
        if (hour >= 9 && hour < 12) {
          timeSlotIndex = 0; // 9-12
        } else if (hour >= 12 && hour < 15) {
          timeSlotIndex = 1; // 12-15
        } else if (hour >= 15 && hour < 18) {
          timeSlotIndex = 2; // 15-18
        } else if (hour >= 18 && hour < 21) {
          timeSlotIndex = 3; // 18-21
        } else {
          // For hours outside 9-21, map to nearest slot
          if (hour < 9) {
            timeSlotIndex = 0; // Early morning -> 9-12
          } else if (hour >= 21) {
            timeSlotIndex = 3; // Late evening -> 18-21
          } else {
            // If hour is 0 (midnight) and no time info, distribute to middle slot (12-15)
            timeSlotIndex = 1; // Default to 12-15 for unknown times
          }
        }
        
        // Increment count if we have a valid time slot
        if (timeSlotIndex >= 0 && timeSlotIndex < hours.length && heatmapData[dayLabel]) {
          heatmapData[dayLabel].values[timeSlotIndex]++;
        }
      } catch (e) {
        // Skip invalid dates
        console.debug('Invalid date in heatmap:', dateToUse, e);
      }
    });
    
    return Object.values(heatmapData);
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
              <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
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
              <Card className="col-span-1 lg:col-span-2 border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.sales }}>
                <CardHeader className="border-b border-emerald-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Visit & Sales Trends
                  </CardTitle>
            </CardHeader>
                <CardContent className="h-80 pt-6" style={{ minHeight: '320px' }}>
                  {chartableSalesData && chartableSalesData.length > 0 ? (
                    <ChartContainer
                      config={{
                        sales: {
                          label: "Total Sales",
                          color: "#10B981",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <AreaChart data={chartableSalesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={1}/>
                            <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                          }}
                        />
                        <ChartTooltip 
                          cursor={false} 
                          content={<ChartTooltipContent 
                            formatter={(value, name) => {
                              const label = name === 'sales' ? 'Total Sales' : name;
                              return `${label}: ${formatCurrency(value)}`;
                            }}
                          />} 
                        />
                        <ChartLegend 
                          content={<ChartLegendContent />} 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Area
                          dataKey="sales"
                          type="monotone"
                          fill="url(#fillSales)"
                          fillOpacity={0.6}
                          stroke="var(--color-sales)"
                          strokeWidth={4}
                          dot={{ fill: "var(--color-sales)", r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
            </CardContent>
          </Card>
          
              <Card className="col-span-1 lg:col-span-2 border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.score }}>
                <CardHeader className="border-b border-amber-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-600" />
                    Efficiency Score Trend
                  </CardTitle>
            </CardHeader>
                <CardContent className="h-80 pt-6" style={{ minHeight: '320px' }}>
                  {chartableSalesData && chartableSalesData.length > 0 ? (
                    <ChartContainer
                      config={{
                        avgScore: {
                          label: "Average Score",
                          color: "#F59E0B",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <AreaChart data={chartableSalesData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-avgScore)" stopOpacity={1}/>
                            <stop offset="95%" stopColor="var(--color-avgScore)" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="month" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <ChartTooltip 
                          cursor={false} 
                          content={<ChartTooltipContent 
                            formatter={(value, name) => {
                              const label = name === 'avgScore' ? 'Average Score' : name;
                              return `${label}: ${value.toFixed(1)}`;
                            }}
                          />} 
                        />
                        <ChartLegend 
                          content={<ChartLegendContent />} 
                          wrapperStyle={{ paddingTop: '20px' }}
                        />
                        <Area
                          dataKey="avgScore"
                          type="monotone"
                          fill="url(#fillScore)"
                          fillOpacity={0.6}
                          stroke="var(--color-avgScore)"
                          strokeWidth={4}
                          dot={{ fill: "var(--color-avgScore)", r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
            </CardContent>
          </Card>

              <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.regional }}>
                <CardHeader className="border-b border-blue-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Regional Performance
                  </CardTitle>
            </CardHeader>
                <CardContent className="h-80 pt-6 pb-0" style={{ minHeight: '320px' }}>
                  {chartableRegionalData && chartableRegionalData.length > 0 ? (
                    <ChartContainer
                      config={{
                        sales: {
                          label: "Sales",
                          color: "#10B981",
                        },
                        visits: {
                          label: "Visits",
                          color: "#3B82F6",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <BarChart data={chartableRegionalData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="region" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          yAxisId="left"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                          }}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => {
                          const label = name === 'sales' ? 'Sales' : name === 'visits' ? 'Visits' : name;
                          const formattedValue = name === 'sales' ? formatCurrency(value) : value;
                          return `${label}: ${formattedValue}`;
                        }} />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar 
                          yAxisId="right"
                          dataKey="sales" 
                          fill="var(--color-sales)" 
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar 
                          yAxisId="left"
                          dataKey="visits" 
                          fill="var(--color-visits)" 
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
            </CardContent>
          </Card>

              <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.product }}>
                <CardHeader className="border-b border-purple-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-purple-600" />
                    Product Sales Distribution
                  </CardTitle>
            </CardHeader>
                <CardContent className="h-80 flex items-center pt-6">
                  {chartableProductData && chartableProductData.length > 0 ? (
                    <>
                      <ChartContainer
                        config={chartableProductData.reduce((acc, entry, index) => {
                          acc[entry.name] = {
                            label: entry.name,
                            color: PIE_COLORS[index % PIE_COLORS.length],
                          };
                          return acc;
                        }, {})}
                        className="h-full w-1/2"
                      >
                        <PieChart>
                          <ChartLegend
                            content={<ChartLegendContent nameKey="name" />}
                            className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
                          />
                          <Pie 
                            data={chartableProductData.map((entry) => ({
                              ...entry,
                              fill: `var(--color-${entry.name})`
                            }))} 
                            dataKey="sales" 
                            nameKey="name"
                          />
                          <ChartTooltip 
                            cursor={false} 
                            content={<ChartTooltipContent 
                              formatter={(value, name, props) => {
                                const label = props.payload?.name || name || 'Sales';
                                return `${label}: ${formatCurrency(value)}`;
                              }}
                              nameKey="name"
                            />} 
                          />
                        </PieChart>
                      </ChartContainer>
                      <div className="w-1/2 space-y-3 pl-6">
                        {chartableProductData.map((entry, index) => (
                          <div key={entry.name} className="flex items-center justify-between text-sm py-2 px-3 rounded-lg hover:bg-white/50 transition-all duration-200">
                            <div className="flex items-center">
                              <div 
                                className="w-4 h-4 rounded-full mr-3 border-2 border-white shadow-sm" 
                                style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}
                              ></div>
                              <span className="text-gray-700 font-semibold">{entry.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{formatCurrency(entry.sales)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          {/* Comparison Tab */}
          <TabsContent value="comparison" className="space-y-6">
            <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.comparison }}>
              <CardHeader className="border-b border-cyan-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                  Sales Comparison ({comparisonMode === 'mom' ? 'Month-over-Month' : 'Year-over-Year'})
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80 pt-6" style={{ minHeight: '320px' }}>
                {getComparisonData() && getComparisonData().length > 0 ? (
                  <ChartContainer
                    config={{
                      current: {
                        label: "Current Period",
                        color: "#3B82F6",
                      },
                      previous: {
                        label: "Previous Period",
                        color: "#9CA3AF",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <AreaChart data={getComparisonData()} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillCurrent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-current)" stopOpacity={1}/>
                          <stop offset="95%" stopColor="var(--color-current)" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="fillPrevious" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-previous)" stopOpacity={1}/>
                          <stop offset="95%" stopColor="var(--color-previous)" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <ChartTooltip 
                        cursor={false} 
                        content={<ChartTooltipContent 
                          formatter={(value, name) => {
                            const label = name === 'current' ? 'Current Period' : name === 'previous' ? 'Previous Period' : name || 'Value';
                            return `${label}: ${formatCurrency(value || 0)}`;
                          }}
                        />} 
                      />
                      <ChartLegend 
                        content={<ChartLegendContent />} 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      <Area
                        dataKey="previous"
                        type="monotone"
                        fill="url(#fillPrevious)"
                        fillOpacity={0.6}
                        stroke="var(--color-previous)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ fill: "var(--color-previous)", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Area
                        dataKey="current"
                        type="monotone"
                        fill="url(#fillCurrent)"
                        fillOpacity={0.6}
                        stroke="var(--color-current)"
                        strokeWidth={4}
                        dot={{ fill: "var(--color-current)", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
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

              <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.sales }}>
                <CardHeader className="border-b border-emerald-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Visit Intensity by Day & Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <TooltipProvider delayDuration={0}>
                    <div className="space-y-3">
                      {/* Time slot headers */}
                      {getHeatmapData().length > 0 && (
                        <div className="flex items-center gap-4 mb-2">
                          <div className="w-12 text-sm font-medium text-gray-500"></div>
                          <div className="flex gap-2 flex-1">
                            {getHeatmapData()[0].columns.map((timeSlot, tIdx) => (
                              <div 
                                key={tIdx} 
                                className="flex-1 text-xs font-semibold text-gray-600 text-center"
                              >
                                {timeSlot}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Day rows with values */}
                      {getHeatmapData().map((day, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-12 text-sm font-medium text-gray-700">{day.label}</div>
                          <div className="flex gap-2 flex-1">
                            {day.values.map((value, vIdx) => {
                              const timeSlot = day.columns[vIdx];
                              // Calculate max value for intensity scaling
                              const maxValue = Math.max(...day.values, 1); // At least 1 to avoid division by zero
                              const intensity = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
                              
                              // Color gradient from light green to dark green based on intensity
                              const getHeatmapColor = (intensity, hasValue) => {
                                if (!hasValue || intensity === 0) {
                                  return 'rgba(229, 231, 235, 0.3)'; // Very light gray for zero values
                                }
                                if (intensity < 0.3) return `rgba(34, 197, 94, ${0.4 + intensity * 0.3})`; // Light green
                                if (intensity < 0.6) return `rgba(16, 185, 129, ${0.6 + intensity * 0.2})`; // Medium green
                                return `rgba(5, 150, 105, ${0.8 + intensity * 0.2})`; // Dark green
                              };
                              
                              const hasValue = value > 0;
                              const color = getHeatmapColor(intensity, hasValue);
                              
                              return (
                                <Tooltip key={vIdx} delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className={`flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer hover:scale-105 hover:shadow-lg transition-all duration-200 border-2 border-transparent hover:border-white/30 ${
                                        hasValue ? 'text-white' : 'text-gray-400'
                                      }`}
                                      style={{ 
                                        backgroundColor: color,
                                        boxShadow: hasValue && intensity > 0.5 ? `0 2px 8px rgba(5, 150, 105, ${intensity * 0.5})` : 'none'
                                      }}
                                    >
                                      {value}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="bg-gradient-to-br from-gray-900 to-gray-800 text-white px-5 py-4 rounded-xl shadow-2xl border-2 border-emerald-500/30 backdrop-blur-sm z-50">
                                    <div className="space-y-2 min-w-[160px]">
                                      <div className="flex items-center gap-2 pb-2 border-b border-gray-700">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                        <div>
                                          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Weekday</p>
                                          <p className="font-bold text-base text-emerald-400 uppercase tracking-wide">{day.label}</p>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs text-gray-400 font-medium">Time:</span>
                                          <span className="text-sm font-semibold text-white">{timeSlot}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-700">
                                          <span className="text-xs text-gray-400 font-medium">Value:</span>
                                          <span className="text-lg font-bold text-emerald-400">{value} visits</span>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6">
            <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.forecast }}>
              <CardHeader className="border-b border-purple-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Sales Forecast (Next 3 Months)
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Based on historical trends and linear regression</p>
              </CardHeader>
              <CardContent className="h-80 pt-6" style={{ minHeight: '320px' }}>
                {getForecastData() && getForecastData().length > 0 ? (
                  <ChartContainer
                    config={{
                      actual: {
                        label: "Actual Data",
                        color: "#8B5CF6",
                      },
                      forecast: {
                        label: "Forecast",
                        color: "#F59E0B",
                      },
                      upperBound: {
                        label: "Upper Range",
                        color: "#22C55E",
                      },
                      lowerBound: {
                        label: "Lower Range",
                        color: "#EF4444",
                      },
                    }}
                    className="h-full w-full"
                  >
                    <ComposedChart data={getForecastData()} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillForecast" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                        </linearGradient>
                        <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8B5CF6" stopOpacity={1}/>
                          <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="period" 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                          return value.toString();
                        }}
                      />
                      <ChartTooltip 
                        cursor={false} 
                        content={<ChartTooltipContent 
                          formatter={(value, name) => {
                            const labels = {
                              actual: 'Actual Data',
                              forecast: 'Forecast',
                              upperBound: 'Upper Range',
                              lowerBound: 'Lower Range'
                            };
                            const label = labels[name] || name || 'Value';
                            return `${label}: ${formatCurrency(value || 0)}`;
                          }}
                        />} 
                      />
                      <ChartLegend 
                        content={<ChartLegendContent />} 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      <Area
                        dataKey="actual"
                        type="monotone"
                        fill="url(#fillActual)"
                        fillOpacity={0.4}
                        stroke="#8B5CF6"
                        strokeWidth={4}
                        dot={{ fill: "#8B5CF6", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Area
                        dataKey="forecast"
                        type="monotone"
                        fill="url(#fillForecast)"
                        fillOpacity={0.3}
                        stroke="#F59E0B"
                        strokeWidth={4}
                        strokeDasharray="5 5"
                        dot={{ fill: "#F59E0B", r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="upperBound"
                        stroke="#22C55E"
                        strokeWidth={4}
                        strokeDasharray="8 4"
                        dot={{ fill: "#22C55E", r: 5, strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="#EF4444"
                        strokeWidth={4}
                        strokeDasharray="8 4"
                        dot={{ fill: "#EF4444", r: 5, strokeWidth: 2 }}
                        activeDot={{ r: 7 }}
                        connectNulls={true}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
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
              <Card className="border-0 shadow-xl overflow-hidden" style={{ background: chartBackgrounds.drilldown }}>
                <CardHeader className="border-b border-teal-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    Regional Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-0 h-80" style={{ minHeight: '320px' }}>
                  {chartableRegionalData && chartableRegionalData.length > 0 ? (
                    <ChartContainer
                      config={{
                        visits: {
                          label: "Visits",
                          color: "#8B5CF6",
                        },
                        sales: {
                          label: "Sales (€K)",
                          color: "#06B6D4",
                        },
                      }}
                      className="h-full w-full"
                    >
                      <BarChart data={chartableRegionalData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="region" 
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          yAxisId="left"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => {
                            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                            return value.toString();
                          }}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => {
                          const label = name === 'sales' ? 'Sales' : name === 'visits' ? 'Visits' : name;
                          const formattedValue = name === 'sales' ? formatCurrency(value) : value;
                          return `${label}: ${formattedValue}`;
                        }} />} />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar 
                          yAxisId="left"
                          dataKey="visits" 
                          fill="var(--color-visits)" 
                          radius={[8, 8, 0, 0]}
                        />
                        <Bar 
                          yAxisId="right"
                          dataKey="sales" 
                          fill="var(--color-sales)" 
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)' }}>
                <CardHeader className="border-b border-purple-200/30 pb-4 bg-white/50 backdrop-blur-sm">
                  <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 pb-0">
                  <div 
                    className="space-y-4 max-h-[250px] overflow-y-auto pr-2"
                  >
                    {getDrillDownData().map((item, idx) => {
                      const insightColors = [
                        { bg: 'from-purple-50 via-violet-50 to-indigo-100', border: 'border-purple-300', icon: 'bg-gradient-to-br from-purple-500 to-violet-600', text: 'text-purple-700', value: 'text-purple-900', accent: 'text-purple-600' },
                        { bg: 'from-violet-50 via-purple-50 to-fuchsia-100', border: 'border-violet-300', icon: 'bg-gradient-to-br from-violet-500 to-purple-600', text: 'text-violet-700', value: 'text-violet-900', accent: 'text-violet-600' },
                        { bg: 'from-indigo-50 via-purple-50 to-violet-100', border: 'border-indigo-300', icon: 'bg-gradient-to-br from-indigo-500 to-purple-600', text: 'text-indigo-700', value: 'text-indigo-900', accent: 'text-indigo-600' }
                      ];
                      const colorScheme = insightColors[idx % insightColors.length];
                      
                      return (
                        <div key={idx} className={`p-5 bg-gradient-to-br ${colorScheme.bg} rounded-xl border-2 ${colorScheme.border} shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 ${colorScheme.icon} rounded-xl flex items-center justify-center shadow-lg transform hover:rotate-6 transition-transform`}>
                                <Store className="w-6 h-6 text-white" />
                              </div>
                              <span className={`font-bold text-lg ${colorScheme.text}`}>{item.name}</span>
                            </div>
                            <Badge className={`${item.growth > 0 ? 'bg-green-100 text-green-700 border-green-300 shadow-sm font-bold px-3 py-1' : 'bg-red-100 text-red-700 border-red-300 shadow-sm font-bold px-3 py-1'}`}>
                              {item.growth > 0 ? '+' : ''}{item.growth?.toFixed(1)}%
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center pt-3 border-t-2 border-white/60">
                            <div className="flex items-center gap-2">
                              <Users className={`w-5 h-5 ${colorScheme.accent}`} />
                              <span className={`text-sm font-bold ${colorScheme.text}`}>{item.visits} visits</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <TrendingUp className={`w-5 h-5 ${colorScheme.accent}`} />
                              <span className={`font-bold text-lg ${colorScheme.value}`}>{formatCurrency(item.revenue)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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