
import React from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin,
  Clock,
  Star,
  ExternalLink,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const getShopTypeColor = (type) => {
  const colors = {
    growshop: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
    garden_center: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700",
    nursery: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700",
    hydroponics_store: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700",
    other: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-600"
  };
  return colors[type] || colors.other;
};

const getPriorityColor = (priority) => {
  const colors = {
    high: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700",
    medium: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    low: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700"
  };
  return colors[priority] || colors.medium;
};

export default function RecentVisits({ visits }) {
  // Filter out appointments - only show actual visits (drafts or done)
  const recentVisits = visits.filter(visit => visit.visit_status !== "appointment");
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="shadow-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200/60 dark:border-gray-600/60 flex flex-col h-[500px] md:h-[550px] lg:h-[600px] w-full min-w-0">
        <CardHeader className="border-b border-white/10 dark:border-gray-700/30 flex-shrink-0 px-4 md:px-5 lg:px-6 py-3 md:py-3.5 lg:py-4 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <CardTitle className="text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white truncate min-w-0">Recent Visits</CardTitle>
            <Link to={createPageUrl("Reports")} className="flex-shrink-0">
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600 text-xs md:text-sm">
                <span className="hidden sm:inline">View All</span>
                <ExternalLink className="w-4 h-4 sm:ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-0 flex-1 overflow-hidden min-w-0">
          <div className={`md:space-y-0 space-y-3 md:space-y-0 p-3 md:p-0 h-full min-w-0 ${recentVisits.length > 0 ? 'overflow-y-auto overflow-x-visible' : ''}`}>
            {recentVisits.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">No visits recorded yet</p>
                <Link to={createPageUrl("NewVisit")}>
                  <Button className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600">
                    Create Your First Visit Report
                  </Button>
                </Link>
              </div>
            ) : (
              recentVisits.map((visit, index) => (
                <Link to={createPageUrl(`NewVisit?id=${visit.id}`)} key={visit.id} className="block">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="md:p-4 lg:p-6 p-4 md:border-b border-b-0 md:border-gray-50 dark:md:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 rounded-lg md:rounded-none bg-white dark:bg-gray-800/50 shadow-sm md:shadow-none border border-gray-200 dark:border-gray-700 md:border-0"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                          <h3 className="font-semibold text-sm md:text-base lg:text-lg text-gray-900 dark:text-white truncate">
                            {visit.shop_name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 font-mono text-xs flex-shrink-0"
                          >
                            ID: {visit.id}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={`${getShopTypeColor(visit.shop_type)} text-xs flex-shrink-0`}
                          >
                            {visit.shop_type?.replace('_', ' ')}
                          </Badge>
                          {visit.priority_level && (
                            <Badge 
                              variant="secondary"
                              className={`${getPriorityColor(visit.priority_level)} text-xs flex-shrink-0`}
                            >
                              {visit.priority_level} priority
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2 md:mb-3">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{visit.shop_address || 'Address not specified'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 flex-shrink-0" />
                            <span>
                              {visit.visit_date ? (() => {
                                try {
                                  const date = new Date(visit.visit_date);
                                  return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d, yyyy');
                                } catch (e) {
                                  return 'Invalid date';
                                }
                              })() : 'No date'}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize truncate">
                          {visit.visit_purpose?.replace('_', ' ') || 'Purpose not specified'}
                        </p>
                      </div>
                      
                      <div className="flex md:flex-col md:text-right items-center md:items-end justify-between md:justify-start gap-2 md:gap-0 flex-shrink-0">
                        {visit.calculated_score && (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {visit.calculated_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {visit.follow_up_required && (
                          <Badge variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 text-xs">
                            Follow-up
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
