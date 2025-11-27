import React, { useState, useEffect } from "react";
import { ShopVisit } from "@/api/entities";
import { User as UserEntity, Customer } from "@/api/entities";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calendar,
  MapPin,
  User,
  FileText,
  StickyNote,
  Target,
  Search,
  Filter,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format, startOfDay, startOfWeek, startOfMonth, isToday, isTomorrow, isThisWeek } from "date-fns";
import ExportOptions from "../components/reports/ExportOptions";
import { Skeleton } from "@/components/ui/skeleton";

export default function PlannedVisits() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [visits, searchTerm, dateRange]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load enough data initially so we don't need to update it later (prevents confusion)
      const visitsData = await ShopVisit.list("-created_at", 200).catch(() => []);
      
      // Filter only planned visits (appointment status)
      const plannedVisits = (visitsData || []).filter(visit => visit.visit_status === "appointment");
      
      setVisits(plannedVisits);
      setIsLoading(false); // Show page immediately after critical data loads
      
      // Load secondary data in background (non-blocking, doesn't change visits)
      Promise.all([
        UserEntity.list().catch(() => []),
        Customer.list().catch(() => [])
      ]).then(([usersData, customersData]) => {
        setUsers(usersData || []);
        setCustomers(customersData || []);
      }).catch(() => {});
      // No progressive loading - data stays stable to avoid user confusion
    } catch (error) {
      console.error("Failed to load data:", error);
      setVisits([]);
      setIsLoading(false);
    }
  };

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.email || "Unknown User") : null;
  };

  const getCustomerVisitNotes = (customerId) => {
    if (!customerId) return null;
    const customer = customers.find(c => c.id === customerId);
    return customer?.visit_notes || null;
  };

  const applyFilters = () => {
    let filtered = [...visits];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.shop_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.appointment_description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case "today":
          filtered = filtered.filter(visit => {
            if (!visit.planned_visit_date) return false;
            const plannedDate = new Date(visit.planned_visit_date);
            return isToday(plannedDate);
          });
          break;
        case "tomorrow":
          filtered = filtered.filter(visit => {
            if (!visit.planned_visit_date) return false;
            const plannedDate = new Date(visit.planned_visit_date);
            return isTomorrow(plannedDate);
          });
          break;
        case "week":
          filtered = filtered.filter(visit => {
            if (!visit.planned_visit_date) return false;
            const plannedDate = new Date(visit.planned_visit_date);
            return isThisWeek(plannedDate);
          });
          break;
        case "upcoming":
          filtered = filtered.filter(visit => {
            if (!visit.planned_visit_date) return false;
            const plannedDate = new Date(visit.planned_visit_date);
            return plannedDate >= now;
          });
          break;
        default:
          break;
      }
    }

    // Sort by planned_visit_date, earliest first
    filtered.sort((a, b) => {
      if (!a.planned_visit_date && !b.planned_visit_date) return 0;
      if (!a.planned_visit_date) return 1;
      if (!b.planned_visit_date) return -1;
      return new Date(a.planned_visit_date) - new Date(b.planned_visit_date);
    });

    setFilteredVisits(filtered);
    setSelectedVisits([]);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return format(date, "MMM dd, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return format(date, "HH:mm");
    } catch (e) {
      return "";
    }
  };

  const getDateBadge = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
      
      if (isToday(date)) {
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Today</Badge>;
      } else if (isTomorrow(date)) {
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Tomorrow</Badge>;
      } else if (date < new Date()) {
        return <Badge variant="destructive">Past</Badge>;
      }
      return null;
    } catch (e) {
      return null;
    }
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
      'Planned Visit Date': visit.planned_visit_date ? (() => {
        try {
          const date = new Date(visit.planned_visit_date);
          return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd HH:mm');
        } catch (e) {
          return '';
        }
      })() : '',
      'Contact Person': visit.contact_person,
      'Visit Purpose': visit.visit_purpose?.replace('_', ' '),
      'Assigned User': visit.assigned_user_id ? (getUserName(visit.assigned_user_id) || `User ID: ${visit.assigned_user_id}`) : '',
      'Appointment Description': visit.appointment_description || '',
      'Shop Address': visit.shop_address || '',
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
      link.download = `planned-visits-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Group visits by date for stats
  const todayVisits = filteredVisits.filter(v => {
    if (!v.planned_visit_date) return false;
    try {
      return isToday(new Date(v.planned_visit_date));
    } catch {
      return false;
    }
  });

  const upcomingVisits = filteredVisits.filter(v => {
    if (!v.planned_visit_date) return false;
    try {
      const date = new Date(v.planned_visit_date);
      return date >= new Date();
    } catch {
      return false;
    }
  });

  const pastVisits = filteredVisits.filter(v => {
    if (!v.planned_visit_date) return false;
    try {
      const date = new Date(v.planned_visit_date);
      return date < new Date();
    } catch {
      return false;
    }
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
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

          {/* List Skeleton */}
          <Card className="p-4 md:p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Planned Visits</h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
              View and manage your scheduled visit appointments
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
                    <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Total Planned</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{filteredVisits.length}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
                    <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Today</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{todayVisits.length}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
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
                    <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{upcomingVisits.length}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
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
                    <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Past</p>
                    <p className="text-2xl md:text-3xl font-bold text-orange-600 dark:text-orange-400">{pastVisits.length}</p>
                  </div>
                  <Calendar className="w-6 h-6 md:w-8 md:h-8 text-orange-600 dark:text-orange-400 flex-shrink-0" />
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
                    placeholder="Search by shop name, address, contact, or description..."
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
                  className="w-full h-9 md:h-10 px-3 rounded-md border border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">This Week</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planned Visits List */}
        <Card>
          <CardHeader className="px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
            <CardTitle className="text-base md:text-lg">Scheduled Visits</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {filteredVisits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No planned visits found</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {filteredVisits.map((visit, index) => (
                  <motion.div
                    key={visit.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`${createPageUrl("NewVisit")}?id=${visit.id}`}>
                      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-700">
                        <CardContent className="p-4 md:p-5">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900 dark:text-white text-base md:text-lg">
                                    {visit.shop_name || "Unnamed Shop"}
                                  </h3>
                                  {getDateBadge(visit.planned_visit_date)}
                                  <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                                    Appointment
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              {visit.planned_visit_date && (
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span className="font-medium">{formatDate(visit.planned_visit_date)}</span>
                                  {formatTime(visit.planned_visit_date) && (
                                    <span className="text-gray-500">• {formatTime(visit.planned_visit_date)}</span>
                                  )}
                                </div>
                              )}

                              {visit.assigned_user_id && getUserName(visit.assigned_user_id) && (
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span>{getUserName(visit.assigned_user_id)}</span>
                                </div>
                              )}

                              {visit.visit_purpose && (
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                  <span className="capitalize">{visit.visit_purpose.replace(/_/g, ' ')}</span>
                                </div>
                              )}

                              {visit.shop_address && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                  <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                  <span className="truncate">{visit.shop_address}</span>
                                </div>
                              )}
                            </div>

                            {visit.appointment_description && visit.appointment_description.trim() && (
                              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                <p className="line-clamp-2">{visit.appointment_description}</p>
                              </div>
                            )}

                            {getCustomerVisitNotes(visit.customer_id) && (
                              <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 pt-2 border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                                <StickyNote className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                                <div className="flex-1">
                                  <span className="font-semibold text-amber-800 dark:text-amber-300">Notes: </span>
                                  <span className="line-clamp-2">{getCustomerVisitNotes(visit.customer_id)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

