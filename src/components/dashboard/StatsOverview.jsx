
import React from 'react';
import { motion } from "framer-motion";
import { 
  Calendar,
  TrendingUp,
  Star,
  CircleAlert
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const StatCard = ({ title, value, icon: Icon, gradientClasses, iconGradientClasses, textColor, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, transform: "none" }}
    animate={{ opacity: 1, transform: "none" }}
    transition={{ delay }}
    className="h-full"
  >
    <div className={`rounded-xl text-card-foreground relative overflow-hidden hover:shadow-lg transition-all duration-300 border shadow-sm h-full ${gradientClasses}`}>
      <div className="p-6 flex items-center justify-between h-full">
        <div className="space-y-2">
          <p className={`text-sm font-semibold ${textColor}`}>
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
              {value}
            </h3>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ${iconGradientClasses}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </motion.div>
);

const PlannedVisitsCard = ({ totalPlannedVisits, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, transform: "none" }}
      animate={{ opacity: 1, transform: "none" }}
      transition={{ delay }}
      className="h-full"
    >
      <Link to={createPageUrl("PlannedVisits")} className="h-full block">
        <div className="rounded-xl text-card-foreground relative overflow-hidden hover:shadow-lg transition-all duration-300 border shadow-sm bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border-blue-100 h-full">
          <div className="p-6 flex items-center justify-between h-full">
            <div className="space-y-2 flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-600">
                Planned Visits
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {totalPlannedVisits || 0}
                </h3>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-200 flex-shrink-0">
              <Calendar className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default function StatsOverview({ totalPlannedVisits, thisWeeksVisits, averageScore, followUpRequired }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
      <PlannedVisitsCard
        totalPlannedVisits={totalPlannedVisits}
        delay={0.1}
      />
      <Link to={createPageUrl("Reports")} className="h-full block">
        <StatCard
          title="Avg. Score"
          value={averageScore.toFixed(1)}
          icon={Star}
          gradientClasses="bg-gradient-to-br from-amber-50 via-amber-50 to-yellow-50 border-amber-100"
          iconGradientClasses="bg-gradient-to-br from-amber-500 to-yellow-600 shadow-amber-200"
          textColor="text-amber-700"
          delay={0.2}
        />
      </Link>
      <Link to={createPageUrl("Reports?followUp=required")} className="h-full block">
        <StatCard
          title="Follow-ups"
          value={followUpRequired}
          icon={CircleAlert}
          gradientClasses="bg-gradient-to-br from-rose-50 via-rose-50 to-red-50 border-rose-100"
          iconGradientClasses="bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-200"
          textColor="text-rose-600"
          delay={0.3}
        />
      </Link>
      <Link to={createPageUrl("Reports?dateRange=week")} className="h-full block">
        <StatCard
          title="This Week"
          value={thisWeeksVisits}
          icon={TrendingUp}
          gradientClasses="bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50 border-emerald-100"
          iconGradientClasses="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200"
          textColor="text-emerald-600"
          delay={0.4}
        />
      </Link>
    </div>
  );
}
