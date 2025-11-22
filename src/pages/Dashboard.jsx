
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
import PlannedVisits from "../components/dashboard/PlannedVisits";
import QuickActions from "../components/dashboard/QuickActions";

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
      // Check for token before making API calls
      const token = localStorage.getItem('access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to get user from cache first
      let userData = null;
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        try {
          userData = JSON.parse(cachedUser);
          setUser(userData);
        } catch (e) {
          // Invalid cache, will fetch fresh
        }
      }

      // Fetch visits first (critical data) to show page faster
      const visitsData = await ShopVisit.list("-created_date", 100).catch((err) => {
        return []; // Return empty array on error
      });
      
      // Ensure visitsData is an array
      const visits = Array.isArray(visitsData) ? visitsData : [];
      setVisits(visits);
      setIsLoading(false); // Show page as soon as visits are loaded
      
      // Fetch user data in background (less critical, already have cached)
      User.me().then((freshUserData) => {
        if (freshUserData) {
          setUser(freshUserData);
          localStorage.setItem('user', JSON.stringify(freshUserData));
        }
      }).catch(() => {
        // Already have cached user, so this is fine
      });
    } catch (error) {
      setVisits([]); // Set empty array on error
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse bg-white dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const todaysVisits = visits.filter(visit => {
    if (!visit.created_date) return false;
    try {
      const visitDate = new Date(visit.created_date);
      if (isNaN(visitDate.getTime())) return false;
      return format(visitDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    } catch (e) {
      return false;
    }
  });

  const thisWeeksVisits = visits.filter(visit => {
    if (!visit.created_date) return false;
    try {
      const visitDate = new Date(visit.created_date);
      if (isNaN(visitDate.getTime())) return false;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return visitDate >= weekAgo;
    } catch (e) {
      return false;
    }
  });

  const averageScore = visits.length > 0 
    ? visits.reduce((sum, visit) => sum + (visit.calculated_score || 0), 0) / visits.length 
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

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Here's your visit activity overview for today
            </p>
          </div>
          <Link to={createPageUrl("NewVisit")}>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 dark:from-green-500 dark:to-green-600 dark:hover:from-green-600 dark:hover:to-green-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Visit Report
            </Button>
          </Link>
        </motion.div>

        {/* Stats Overview */}
        <StatsOverview 
          todaysVisits={todaysVisits.length}
          thisWeeksVisits={thisWeeksVisits.length}
          averageScore={averageScore}
          followUpRequired={followUpRequired}
        />

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <RecentVisits visits={visits.filter(v => v.visit_status !== "appointment").slice(0, 5)} />
            <QuickActions />
          </div>
          
          <div className="space-y-8">
            <PlannedVisits visits={visits.filter(v => v.visit_status === "appointment")} />
            <TopShops visits={visits} />
            
            {/* Action Required Card */}
            {followUpRequired > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-orange-200/30 dark:border-orange-800/30 bg-orange-50/70 dark:bg-orange-900/30 backdrop-blur-xl shadow-xl border border-white/20 dark:border-gray-700/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                      <AlertCircle className="w-5 h-5" />
                      Action Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-700 dark:text-orange-300 mb-4">
                      {followUpRequired} visit{followUpRequired !== 1 ? 's' : ''} require{followUpRequired === 1 ? 's' : ''} follow-up action
                      {firstPendingFollowUp && (
                        <span className="block text-sm mt-2 font-semibold">
                          Next: {firstPendingFollowUp.shop_name || 'Unnamed Shop'}
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      {firstPendingFollowUp ? (
                        <Link to={`${createPageUrl("NewVisit")}?id=${firstPendingFollowUp.id}&section=3&highlight=followup`}>
                          <Button variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40">
                            View Visit Report
                          </Button>
                        </Link>
                      ) : null}
                      <Link to={createPageUrl("FollowUps")}>
                        <Button variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40">
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
      </div>
    </div>
  );
}
