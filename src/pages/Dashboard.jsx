
import React, { useState, useEffect } from "react";
import { ShopVisit } from "@/api/entities";
import { User } from "@/api/entities";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  TrendingUp, 
  MapPin, 
  Clock,
  Star,
  AlertCircle,
  Calendar,
  Users,
  Target
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { motion } from "framer-motion";

import StatsOverview from "../components/dashboard/StatsOverview";
import RecentVisits from "../components/dashboard/RecentVisits";
import TopShops from "../components/dashboard/TopShops";
import QuickActions from "../components/dashboard/QuickActions";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [visits, setVisits] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Listen for the global user update event
    const handleUserUpdate = (event) => {
      // Check for the correct message type and ensure there's a payload
      if (event.data?.type === 'USER_UPDATED' && event.data.payload) {
        // Update the user state directly from the message payload
        setUser(event.data.payload);
      }
    };
    
    window.addEventListener('message', handleUserUpdate);
    return () => window.removeEventListener('message', handleUserUpdate);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Check for token before making API calls
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to get user from cache first (like Admin panel does)
      let cachedUserData = null;
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          cachedUserData = JSON.parse(cachedUser);
          setUser(cachedUserData); // Set cached user immediately for display
        } catch (e) {
          // Invalid cache, will fetch fresh
        }
      }

      // Load critical data in parallel (like Admin panel) - this is the key to speed!
      // Load enough data initially so we don't need to update it later (prevents confusion)
      const [visitsData, freshUserData] = await Promise.all([
        ShopVisit.list("-created_at", 50).catch(() => []), // Load enough data initially
        User.me().catch(() => cachedUserData) // Fallback to cached if API fails
      ]);
      
      // Ensure visitsData is an array
      const visits = Array.isArray(visitsData) ? visitsData : [];
      
      // Use fresh user data if available, otherwise use cached
      if (freshUserData) {
        setUser(freshUserData);
        localStorage.setItem('user', JSON.stringify(freshUserData));
      }
      
      setVisits(visits);
      setIsLoading(false); // Show page immediately after parallel data loads
      // No progressive loading - data stays stable to avoid user confusion
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setVisits([]);
      setIsLoading(false);
    }
  };

  // Calculate total planned visits
  const totalPlannedVisits = visits.filter(visit => visit.visit_status === "appointment").length;

  // Group planned visits by date (kept for potential future use)
  const plannedVisitsByDate = visits
    .filter(visit => visit.visit_status === "appointment" && visit.planned_visit_date)
    .reduce((acc, visit) => {
      try {
        const visitDate = new Date(visit.planned_visit_date);
        if (isNaN(visitDate.getTime())) return acc;
        const dateKey = format(visitDate, 'yyyy-MM-dd');
        acc[dateKey] = (acc[dateKey] || 0) + 1;
        return acc;
      } catch (e) {
        return acc;
      }
    }, {});

  const thisWeeksVisits = visits.filter(visit => {
    // Use created_at (backend field) with fallback to created_date for compatibility
    const dateField = visit.created_at || visit.created_date;
    if (!dateField) return false;
    try {
      const visitDate = new Date(dateField);
      if (isNaN(visitDate.getTime())) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return visitDate >= weekAgo;
    } catch (e) {
      return false;
    }
  });

  // Calculate average score - only count visits that have a calculated_score
  const visitsWithScore = visits.filter(visit => visit.calculated_score != null && visit.calculated_score !== undefined);
  const averageScore = visitsWithScore.length > 0 
    ? visitsWithScore.reduce((sum, visit) => sum + (visit.calculated_score || 0), 0) / visitsWithScore.length 
    : 0;

  const followUpRequired = visits.filter(visit => visit.follow_up_required).length;
  // Find the first pending follow-up visit (requires follow-up but may be missing notes or date)
  // Priority: visits missing notes > visits missing date > any follow-up required visit
  const pendingFollowUpVisits = visits.filter(visit => 
    visit.follow_up_required && 
    (!visit.follow_up_notes || visit.follow_up_notes.trim() === '' || !visit.follow_up_date)
  );
  
  // Sort: missing notes first, then missing date, then by most recent
  const sortedPending = [...pendingFollowUpVisits].sort((a, b) => {
    const aMissingNotes = !a.follow_up_notes || a.follow_up_notes.trim() === '';
    const bMissingNotes = !b.follow_up_notes || b.follow_up_notes.trim() === '';
    if (aMissingNotes && !bMissingNotes) return -1;
    if (!aMissingNotes && bMissingNotes) return 1;
    return 0;
  });
  
  const firstPendingFollowUp = sortedPending.length > 0 
    ? sortedPending[0] 
    : (followUpRequired > 0 ? visits.filter(v => v.follow_up_required)[0] : null);

  if (isLoading) {
    return (
      <div className="p-4 md:p-5 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-full" style={{ width: '100%', minWidth: 0 }}>
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-5 lg:space-y-8" style={{ width: '100%', minWidth: 0 }}>
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>

          {/* Stats Overview Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </Card>
            ))}
          </div>

          {/* Main Content Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 lg:gap-8">
            <div className="md:col-span-1 lg:col-span-3">
              <Card className="p-4 md:p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </Card>
            </div>
            <div className="md:col-span-1 lg:col-span-2 space-y-4 md:space-y-4 lg:space-y-5">
              <Card className="p-4 md:p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-5 lg:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-full" style={{ width: '100%', minWidth: 0 }}>
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-5 lg:space-y-8" style={{ width: '100%', minWidth: 0 }}>
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4"
        >
          <div>
            <h1 className="text-2xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1 md:mt-2">
              Here's your visit activity overview for today
            </p>
          </div>
          <Link to={createPageUrl("NewVisit")}>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 shadow-lg text-sm md:text-base"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
              <span className="hidden sm:inline">New Visit Report</span>
              <span className="sm:hidden">New Visit</span>
            </Button>
          </Link>
        </motion.div>

        {/* Stats Overview */}
        <StatsOverview 
          totalPlannedVisits={totalPlannedVisits}
          thisWeeksVisits={thisWeeksVisits.length}
          averageScore={averageScore}
          followUpRequired={followUpRequired}
        />

        {/* Main Content Grid */}
        <div className="space-y-4 md:space-y-5 lg:space-y-8" style={{ width: '100%', minWidth: 0 }}>
          {/* Recent Visits and Top Performing Shops - Side by Side on Tablet/Desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 lg:gap-8" style={{ width: '100%', minWidth: 0 }}>
            {/* Recent Visits - Full width on tablet, 60% on desktop (3/5 columns) */}
            <div className="md:col-span-1 lg:col-span-3">
              <RecentVisits visits={visits.filter(v => v.visit_status !== "appointment").slice(0, 5)} />
            </div>
            
            {/* Top Performing Shops and Action Required - Full width on tablet, 40% on desktop (2/5 columns) */}
            <div className="md:col-span-1 lg:col-span-2 space-y-4 md:space-y-4 lg:space-y-5">
              <TopShops visits={visits} />
              
              {/* Action Required Card */}
              {followUpRequired > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="border-orange-200/30 dark:border-orange-800/30 bg-orange-50/70 dark:bg-orange-900/30 backdrop-blur-xl shadow-xl border-2 border-orange-300/60 dark:border-orange-600/60 flex flex-col h-[200px] md:h-[220px] lg:h-[240px]">
                    <CardHeader className="pb-2 md:pb-2.5 px-4 md:px-4 lg:px-5 pt-3 md:pt-3.5 lg:pt-4 flex-shrink-0">
                      <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300 text-base md:text-base lg:text-lg">
                        <AlertCircle className="w-4 h-4 md:w-4 md:h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                        Action Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 md:px-4 lg:px-5 pb-3 md:pb-3.5 lg:pb-4 flex-1 flex flex-col justify-between">
                      <p className="text-sm md:text-sm lg:text-base text-orange-700 dark:text-orange-300 mb-2 md:mb-2 lg:mb-3">
                        {followUpRequired} visit{followUpRequired !== 1 ? 's' : ''} require{followUpRequired === 1 ? 's' : ''} follow-up action
                        {firstPendingFollowUp && (
                          <span className="block text-xs md:text-xs lg:text-sm mt-1.5 md:mt-1.5 lg:mt-2 font-semibold">
                            Next: {firstPendingFollowUp.shop_name || 'Unnamed Shop'}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-col md:flex-col lg:flex-row gap-2">
                        {firstPendingFollowUp ? (
                          <Link to={`${createPageUrl("NewVisit")}?id=${firstPendingFollowUp.id}&section=3&highlight=followup`} className="flex-1">
                            <Button variant="outline" className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-xs md:text-xs lg:text-sm">
                              View Visit Report
                            </Button>
                          </Link>
                        ) : null}
                        <Link to={createPageUrl("FollowUps")} className="flex-1">
                          <Button variant="outline" className="w-full border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 text-xs md:text-xs lg:text-sm">
                            View All
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Quick Actions - Full Width */}
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
