
import React from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Calendar,
  TrendingUp,
  Star,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const StatCard = ({ title, value, icon: Icon, color, trend, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
  >
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 ${color} rounded-full opacity-10`} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          <div className={`p-2 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {value}
        </div>
        {trend && (
          <p className="text-xs text-gray-500">
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

export default function StatsOverview({ todaysVisits, thisWeeksVisits, averageScore, followUpRequired }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Link to={createPageUrl("Reports?dateRange=today")}>
        <StatCard
          title="Today's Visits"
          value={todaysVisits}
          icon={Calendar}
          color="bg-blue-500"
          trend="Great progress today!"
          delay={0.1}
        />
      </Link>
      <Link to={createPageUrl("Reports?dateRange=week")}>
        <StatCard
          title="This Week"
          value={thisWeeksVisits}
          icon={TrendingUp}
          color="bg-green-500"
          trend="Keep up the momentum"
          delay={0.2}
        />
      </Link>
      <Link to={createPageUrl("Reports")}>
        <StatCard
          title="Avg. Score"
          value={`${averageScore.toFixed(1)}/100`}
          icon={Star}
          color="bg-purple-500"
          trend="Quality visits matter"
          delay={0.3}
        />
      </Link>
      <Link to={createPageUrl("Reports?followUp=required")}>
        <StatCard
          title="Follow-ups"
          value={followUpRequired}
          icon={AlertCircle}
          color="bg-orange-500"
          trend="Action items pending"
          delay={0.4}
        />
      </Link>
    </div>
  );
}
