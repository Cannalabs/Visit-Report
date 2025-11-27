import React, { useState, useEffect } from "react";
import { ShopVisit } from "@/api/entities";
import { User } from "@/api/entities";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Filter,
  Download,
  Search,
  Calendar,
  MapPin,
  Star,
  TrendingUp,
  Eye,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";

import FollowUpTable from "../components/reports/FollowUpTable";
import ExportOptions from "../components/reports/ExportOptions";
import { Skeleton } from "@/components/ui/skeleton";

export default function FollowUps() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadVisits();
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const userList = await User.list().catch(() => []);
      setUsers(userList || []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.email) : null;
  };

  useEffect(() => {
    applyFilters();
  }, [visits, searchTerm, dateRange]);

  const loadVisits = async () => {
    try {
      setIsLoading(true);
      
      // Get cached user first for immediate filtering
      let currentUserData = null;
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          currentUserData = JSON.parse(cachedUser);
          setCurrentUser(currentUserData);
        } catch (e) {
          // Invalid cache, will fetch fresh
        }
      }
      
      // Load enough data initially so we don't need to update it later (prevents confusion)
      const data = await ShopVisit.list("-created_at", 200).catch(() => []);
      
      // Filter only visits that require follow-up AND are assigned to current user OR created by current user
      const followUpVisits = data.filter(visit => {
        if (visit.follow_up_required !== true) return false;
        // Show follow-ups assigned to current user OR created by current user
        if (currentUserData) {
          const isAssigned = visit.follow_up_assigned_user_id === currentUserData.id;
          const isCreator = visit.created_by === currentUserData.id;
          return isAssigned || isCreator;
        }
        return false;
      });
      
      setVisits(followUpVisits);
      setIsLoading(false); // Show page immediately after critical data loads
      
      // Refresh user data in background if not cached (only updates user, not visits)
      if (!currentUserData) {
        User.me().then(user => {
          if (user) {
            setCurrentUser(user);
            localStorage.setItem('user', JSON.stringify(user));
            // Re-filter visits with fresh user data (only if user was missing)
            const freshFollowUps = data.filter(visit => {
              if (visit.follow_up_required !== true) return false;
              const isAssigned = visit.follow_up_assigned_user_id === user.id;
              const isCreator = visit.created_by === user.id;
              return isAssigned || isCreator;
            });
            setVisits(freshFollowUps);
          }
        }).catch(() => {});
      }
      // No progressive loading - data stays stable to avoid user confusion
    } catch (error) {
      console.error("Error loading visits:", error);
      setVisits([]);
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...visits];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.shop_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.follow_up_notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (dateRange) {
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
      'Follow-up Notes': visit.follow_up_notes || '',
      'Follow-up Date': visit.follow_up_date ? (() => {
        try {
          const date = new Date(visit.follow_up_date);
          return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd');
        } catch (e) {
          return '';
        }
      })() : '',
      'Follow-up Assigned User': visit.follow_up_assigned_user_id ? (getUserName(visit.follow_up_assigned_user_id) || `User ID: ${visit.follow_up_assigned_user_id}`) : '',
      'Follow-up Stage': visit.follow_up_stage || '',
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
      link.download = `follow-up-visits-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const handleViewVisit = (visitId) => {
    navigate(`/NewVisit?id=${visitId}`);
  };

  // Pending: stage is "pending" or "in_progress" or no stage set
  const pendingFollowUps = filteredVisits.filter(v => 
    !v.follow_up_stage || 
    v.follow_up_stage === 'pending' || 
    v.follow_up_stage === 'in_progress'
  );
  // Completed: stage is "completed"
  const completedFollowUps = filteredVisits.filter(v => v.follow_up_stage === 'completed');

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </Card>
            ))}
          </div>

          {/* Filters Skeleton */}
          <Card className="p-4 md:p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-48" />
            </div>
          </Card>

          {/* Table Skeleton */}
          <Card className="p-4 md:p-6">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Follow-up Visits</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">
              Track and manage visits that require follow-up actions
            </p>
          </div>
          <ExportOptions onExport={exportData} selectedCount={selectedVisits.length} />
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-600">Total Follow-ups</p>
                    <p className="text-2xl md:text-3xl font-bold">{filteredVisits.length}</p>
                  </div>
                  <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-orange-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-600">{pendingFollowUps.length}</p>
                  </div>
                  <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-orange-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-600">{completedFollowUps.length}</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm font-medium text-gray-600">In Progress</p>
                    <p className="text-2xl md:text-3xl font-bold">
                      {filteredVisits.filter(v => v.follow_up_stage === 'in_progress').length}
                    </p>
                  </div>
                  <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Filter className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4 md:p-6">
            <div className="flex flex-col md:flex-row gap-3 md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by shop name, address, contact, or follow-up notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 md:h-10 text-sm md:text-base"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full h-9 md:h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <FollowUpTable
          visits={filteredVisits}
          isLoading={isLoading}
          selectedVisits={selectedVisits}
          onSelectionChange={setSelectedVisits}
          onRefresh={loadVisits}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}

