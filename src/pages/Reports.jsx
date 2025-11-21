import React, { useState, useEffect } from "react";
import { ShopVisit } from "@/api/entities";
import { User } from "@/api/entities";
import { Configuration } from "@/api/entities";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import {
  Filter,
  Download,
  Search,
  Calendar,
  MapPin,
  Star,
  TrendingUp,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

import ReportFilters from "../components/reports/ReportFilters";
import VisitTable from "../components/reports/VisitTable";
import ExportOptions from "../components/reports/ExportOptions";

export default function Reports() {
  const location = useLocation();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [shopTypes, setShopTypes] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: "all",
    shopType: "all",
    priority: "all",
    followUp: "all"
  });

  useEffect(() => {
    // On mount, check URL for filters and load data
    const params = new URLSearchParams(location.search);
    const dateRangeParam = params.get('dateRange');
    const followUpParam = params.get('followUp');

    // Create a mutable copy of the current filters state for initial setup
    const initialFilters = { ...filters };
    let hasParams = false;

    if (dateRangeParam && ['today', 'week', 'month', 'all'].includes(dateRangeParam)) {
      initialFilters.dateRange = dateRangeParam;
      hasParams = true;
    }
    if (followUpParam && ['required', 'not_required', 'all'].includes(followUpParam)) {
      initialFilters.followUp = followUpParam;
      hasParams = true;
    }

    if(hasParams) {
      setFilters(initialFilters); // Update filters state if URL parameters were found
    }

    loadVisits();
    loadShopTypes();
  }, [location.search]);

  useEffect(() => {
    applyFilters();
  }, [visits, searchTerm, filters]);

  const loadVisits = async () => {
    try {
      const data = await ShopVisit.list("-created_date", 200);
      setVisits(data);
    } catch (error) {
      console.error("Error loading visits:", error);
    }
    setIsLoading(false);
  };

  const loadShopTypes = async () => {
    try {
      const configs = await Configuration.list({ config_type: "shop_types", is_active: true });
      // Sort by display_order
      const sorted = configs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setShopTypes(sorted);
    } catch (error) {
      // Error loading shop types, will use fallback in ReportFilters
      console.error("Failed to load shop types:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...visits];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.shop_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (filters.dateRange) {
        case "today":
          startDate = startOfDay(now);
          break;
        case "week":
          startDate = startOfWeek(now, { weekStartsOn: 0 });
          break;
        case "month":
          startDate = startOfMonth(now);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        filtered = filtered.filter(visit => {
          const visitCreatedDate = visit.created_date ? new Date(visit.created_date) : null;
          return visitCreatedDate && startOfDay(visitCreatedDate) >= startDate;
        });
      }
    }

    // Shop type filter
    if (filters.shopType !== "all") {
      filtered = filtered.filter(visit => visit.shop_type === filters.shopType);
    }

    // Priority filter
    if (filters.priority !== "all") {
      filtered = filtered.filter(visit => visit.priority_level === filters.priority);
    }

    // Follow-up filter
    if (filters.followUp !== "all") {
      const needsFollowUp = filters.followUp === "required";
      filtered = filtered.filter(visit => visit.follow_up_required === needsFollowUp);
    }

    setFilteredVisits(filtered);
    setSelectedVisits([]); // Reset selection when filters change
  };

  const exportData = async (exportType) => {
    const dataToExport = selectedVisits.length > 0
      ? visits.filter(v => selectedVisits.includes(v.id))
      : filteredVisits;

    if (dataToExport.length === 0) {
      alert("No data to export.");
      return;
    }

    const exportableData = dataToExport.map(visit => ({
      'Shop Name': visit.shop_name,
      'Shop Type': visit.shop_type?.replace('_', ' '),
      'Visit Date': visit.visit_date ? (() => {
        try {
          const date = new Date(visit.visit_date);
          return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd');
        } catch (e) {
          return '';
        }
      })() : '',
      'Contact Person': visit.contact_person,
      'Visit Purpose': visit.visit_purpose?.replace('_', ' '),
      'Score': visit.calculated_score,
      'Priority': visit.priority_level,
      'Commercial Outcome': visit.commercial_outcome?.replace('_', ' '),
      'Order Value': visit.order_value,
      'Follow-up Required': visit.follow_up_required ? 'Yes' : 'No',
      'Satisfaction': visit.overall_satisfaction,
      'Created': visit.created_date ? (() => {
        try {
          const date = new Date(visit.created_date);
          return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd HH:mm');
        } catch (e) {
          return '';
        }
      })() : ''
    }));

    if (exportType === 'csv') {
      // Ensure all values are properly quoted for CSV
      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const headers = Object.keys(exportableData[0]);
      const csvContent = [
        headers.map(escapeCsv).join(','),
        ...exportableData.map(row => headers.map(header => escapeCsv(row[header])).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `canna-visit-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Visit Reports</h1>
            <p className="text-gray-600 mt-2">
              Analyze and export your shop visit data
            </p>
          </div>
          <ExportOptions onExport={exportData} selectedCount={selectedVisits.length} />
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 border-blue-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 mb-1">Total Visits</p>
                    <p className="text-3xl font-bold text-blue-900">{filteredVisits.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <Eye className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 border-yellow-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-700 mb-1">Avg Score</p>
                    <p className="text-3xl font-bold text-amber-900">
                      {filteredVisits.length > 0
                        ? (filteredVisits.reduce((sum, v) => sum + (v.calculated_score || 0), 0) / filteredVisits.length).toFixed(1)
                        : "0.0"
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-md">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gradient-to-br from-orange-50 via-red-50 to-rose-100 border-orange-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-700 mb-1">Follow-ups</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {filteredVisits.filter(v => v.follow_up_required).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 border-green-200/60 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 mb-1">Total Value</p>
                    <p className="text-3xl font-bold text-green-900">
                      €{filteredVisits.reduce((sum, v) => sum + (v.order_value || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Filter className="w-5 h-5 text-gray-600" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by shop name, address, or contact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full h-10 border-gray-200 focus:border-gray-300"
                />
              </div>
            </div>

            <ReportFilters filters={filters} onFiltersChange={setFilters} shopTypes={shopTypes} />
          </CardContent>
        </Card>

        {/* Results Table */}
        <VisitTable
          visits={filteredVisits}
          isLoading={isLoading}
          selectedVisits={selectedVisits}
          onSelectionChange={setSelectedVisits}
          onRefresh={loadVisits}
        />
      </div>
    </div>
  );
}