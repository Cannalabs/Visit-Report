
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
    growshop: "bg-green-100 text-green-800 border-green-200",
    garden_center: "bg-blue-100 text-blue-800 border-blue-200",
    nursery: "bg-purple-100 text-purple-800 border-purple-200",
    hydroponics_store: "bg-orange-100 text-orange-800 border-orange-200",
    other: "bg-gray-100 text-gray-800 border-gray-200"
  };
  return colors[type] || colors.other;
};

const getPriorityColor = (priority) => {
  const colors = {
    high: "bg-red-100 text-red-800 border-red-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-green-100 text-green-800 border-green-200"
  };
  return colors[priority] || colors.medium;
};

export default function RecentVisits({ visits }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Recent Visits</CardTitle>
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" size="sm">
                View All
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {visits.length === 0 ? (
              <div className="p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No visits recorded yet</p>
                <Link to={createPageUrl("NewVisit")}>
                  <Button className="bg-green-600 hover:bg-green-700">
                    Create Your First Visit Report
                  </Button>
                </Link>
              </div>
            ) : (
              visits.map((visit, index) => (
                <Link to={createPageUrl(`NewVisit?id=${visit.id}`)} key={visit.id} className="block">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 border-b border-gray-50 last:border-b-0 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {visit.shop_name}
                          </h3>
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
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
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

                        <p className="text-sm text-gray-600 capitalize">
                          {visit.visit_purpose?.replace('_', ' ') || 'Purpose not specified'}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        {visit.calculated_score && (
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold">
                              {visit.calculated_score.toFixed(1)}
                            </span>
                          </div>
                        )}
                        {visit.follow_up_required && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
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
