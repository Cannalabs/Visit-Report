
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

      const [visitsData, freshUserData] = await Promise.all([
        ShopVisit.list("-created_date", 100),
        User.me().catch(() => userData) // Fallback to cached if API fails
      ]);
      setVisits(visitsData);
      if (freshUserData) {
        setUser(freshUserData);
        localStorage.setItem('user', JSON.stringify(freshUserData));
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
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

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'there'}! 👋
            </h1>
            <p className="text-gray-600 mt-2">
              Here's your visit activity overview for today
            </p>
          </div>
          <Link to={createPageUrl("NewVisit")}>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
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
            <RecentVisits visits={visits.slice(0, 5)} />
            <QuickActions />
          </div>
          
          <div className="space-y-8">
            <TopShops visits={visits} />
            
            {/* Action Required Card */}
            {followUpRequired > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-orange-800">
                      <AlertCircle className="w-5 h-5" />
                      Action Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-orange-700 mb-4">
                      {followUpRequired} visits require follow-up action
                    </p>
                    <Link to={createPageUrl("Reports?followUp=required")}>
                      <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
                        View Details
                      </Button>
                    </Link>
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
