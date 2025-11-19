
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
      <Card className="shadow-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 flex flex-col h-[600px]">
        <CardHeader className="border-b border-white/10 dark:border-gray-700/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Recent Visits</CardTitle>
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" size="sm" className="border-gray-300 dark:border-gray-600">
                View All
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden">
          <div className={`space-y-0 h-full ${recentVisits.length > 0 ? 'overflow-y-auto' : ''}`}>
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
                    className="p-6 border-b border-gray-50 dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {visit.shop_name}
                          </h3>
                          <Badge 
                            variant="outline" 
                            className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 font-mono text-xs"
                          >
                            ID: {visit.id}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className={getShopTypeColor(visit.shop_type)}
                          >
                            {visit.shop_type?.replace('_', ' ')}
                          </Badge>
                          {visit.priority_level && (
                            <Badge 
                              variant="secondary"
                              className={getPriorityColor(visit.priority_level)}
                            >
                              {visit.priority_level} priority
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{visit.shop_address || 'Address not specified'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
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

                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {visit.visit_purpose?.replace('_', ' ') || 'Purpose not specified'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {visit.calculated_score && (
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {visit.calculated_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {visit.follow_up_required && (
                          <Badge variant="outline" className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
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
