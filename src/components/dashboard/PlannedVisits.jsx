import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as UserEntity, Customer } from "@/api/entities";
import { 
  Calendar,
  MapPin,
  User,
  Clock,
  FileText,
  StickyNote,
  Target
} from "lucide-react";
import { format } from "date-fns";

export default function PlannedVisits({ visits }) {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    // Fetch users and customers to get assigned user names and visit notes
    const loadData = async () => {
      try {
        const [usersData, customersData] = await Promise.all([
          UserEntity.list(),
          Customer.list()
        ]);
        setUsers(usersData || []);
        setCustomers(customersData || []);
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };
    loadData();
  }, []);

  // Get user name by ID
  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.email || "Unknown User") : null;
  };

  // Get customer visit notes by customer ID
  const getCustomerVisitNotes = (customerId) => {
    if (!customerId) return null;
    const customer = customers.find(c => c.id === customerId);
    return customer?.visit_notes || null;
  };

  // Filter visits with appointment status
  const plannedVisits = visits
    .filter(visit => visit.visit_status === "appointment")
    .sort((a, b) => {
      // Sort by planned_visit_date, earliest first
      if (!a.planned_visit_date && !b.planned_visit_date) return 0;
      if (!a.planned_visit_date) return 1;
      if (!b.planned_visit_date) return -1;
      return new Date(a.planned_visit_date) - new Date(b.planned_visit_date);
    });
    // Removed .slice(0, 5) to show all planned visits

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="shadow-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200/60 dark:border-gray-600/60 flex flex-col h-[500px] md:h-[550px] lg:h-[600px]">
        <CardHeader className="border-b border-white/10 dark:border-gray-700/30 flex-shrink-0 px-4 md:px-5 lg:px-6 py-3 md:py-3.5 lg:py-4">
          <CardTitle className="text-base md:text-lg lg:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            Planned Visits
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-5 lg:p-6 flex-1 overflow-hidden">
          <div className={`space-y-3 md:space-y-3.5 lg:space-y-4 h-full ${plannedVisits.length > 0 ? 'overflow-y-auto pr-2' : ''}`}>
            {plannedVisits.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No planned visits scheduled
              </p>
            ) : (
              plannedVisits.map((visit, index) => (
                <motion.div
                  key={visit.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-2.5 md:p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <Link to={`${createPageUrl("NewVisit")}?id=${visit.id}`}>
                    <div className="space-y-1.5 md:space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-xs md:text-sm leading-tight">
                          {visit.shop_name || "Unnamed Shop"}
                        </h4>
                        <Badge variant="outline" className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs whitespace-nowrap">
                          Appointment
                        </Badge>
                      </div>
                      
                      <div className="space-y-1.5">
                        {visit.visit_purpose && (
                          <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 font-medium">
                            <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="capitalize">{visit.visit_purpose.replace(/_/g, ' ')}</span>
                          </div>
                        )}
                        
                        {visit.planned_visit_date && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(visit.planned_visit_date)}</span>
                            {formatTime(visit.planned_visit_date) && (
                              <span className="text-gray-500">• {formatTime(visit.planned_visit_date)}</span>
                            )}
                          </div>
                        )}
                        
                        {visit.assigned_user_id && getUserName(visit.assigned_user_id) && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <User className="w-3.5 h-3.5" />
                            <span>{getUserName(visit.assigned_user_id)}</span>
                          </div>
                        )}
                        
                        {visit.shop_address && (
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="truncate">{visit.shop_address}</span>
                          </div>
                        )}
                        
                        {visit.appointment_description && visit.appointment_description.trim() && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1.5 pt-1.5 border-t border-gray-200 dark:border-gray-600">
                            <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                            <span className="line-clamp-3 whitespace-pre-line">{visit.appointment_description}</span>
                          </div>
                        )}
                        
                        {getCustomerVisitNotes(visit.customer_id) && (
                          <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 mt-1.5 pt-1.5 border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                            <StickyNote className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                            <div className="flex-1">
                              <span className="font-semibold text-amber-800 dark:text-amber-300">Notes for This Visit:</span>
                              <span className="ml-1 whitespace-pre-line line-clamp-3">{getCustomerVisitNotes(visit.customer_id)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

