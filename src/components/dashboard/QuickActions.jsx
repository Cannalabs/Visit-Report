
import React from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText,
  Camera,
  MapPin,
  Download,
  Users,
  Settings
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const QuickActionButton = ({ icon: Icon, title, description, to, color, delay = 0 }) => {
  // Map color to hover classes
  const hoverClasses = {
    "bg-green-600": "hover:bg-green-600 dark:hover:bg-green-600",
    "bg-blue-600": "hover:bg-blue-600 dark:hover:bg-blue-600",
    "bg-purple-600": "hover:bg-purple-600 dark:hover:bg-purple-600",
    "bg-orange-600": "hover:bg-orange-600 dark:hover:bg-orange-600",
    "bg-indigo-600": "hover:bg-indigo-600 dark:hover:bg-indigo-600",
    "bg-gray-600": "hover:bg-gray-600 dark:hover:bg-gray-600"
  };
  
  const textColor = color.replace('bg-', 'text-');
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
    >
      <Link to={to} className="w-full">
        <Button
          variant="outline"
          className={`w-full h-auto p-2.5 md:p-3 lg:p-4 flex-col gap-1 md:gap-1.5 lg:gap-2 border-gray-300/50 dark:border-gray-600/50 ${hoverClasses[color] || 'hover:bg-gray-600'} hover:text-white dark:hover:text-white transition-all duration-200 group bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm min-h-[90px] md:min-h-[100px] lg:min-h-[120px]`}
        >
          <Icon className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 ${textColor} group-hover:text-white dark:text-gray-400 flex-shrink-0`} />
          <div className="text-center w-full min-w-0">
            <div className="font-semibold text-xs md:text-sm lg:text-base text-gray-900 dark:text-white group-hover:text-white truncate">{title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/80 line-clamp-2 leading-tight mt-0.5">
              {description}
            </div>
          </div>
        </Button>
      </Link>
    </motion.div>
  );
};

export default function QuickActions() {
  const actions = [
    {
      icon: FileText,
      title: "New Visit",
      description: "Start a new shop visit report",
      to: createPageUrl("NewVisit"),
      color: "bg-green-600",
      delay: 0.1
    },
    {
      icon: Camera,
      title: "Quick Photo",
      description: "Take photos for existing visit",
      to: createPageUrl("VisitSelector"),
      color: "bg-blue-600",
      delay: 0.2
    },
    {
      icon: MapPin,
      title: "Nearby Shops",
      description: "Find shops in your area",
      to: createPageUrl("Reports"),
      color: "bg-purple-600",
      delay: 0.3
    },
    {
      icon: Download,
      title: "Export Data",
      description: "Download your reports",
      to: createPageUrl("Reports"),
      color: "bg-orange-600",
      delay: 0.4
    },
    {
      icon: Users,
      title: "Team View",
      description: "See team performance",
      to: createPageUrl("Reports"),
      color: "bg-indigo-600",
      delay: 0.5
    },
    {
      icon: Settings,
      title: "Settings",
      description: "Configure preferences",
      to: createPageUrl("Settings"),
      color: "bg-gray-600",
      delay: 0.6
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="shadow-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border-2 border-gray-200/60 dark:border-gray-600/60">
        <CardHeader className="border-b border-white/10 dark:border-gray-700/30 px-4 md:px-5 lg:px-6 py-3 md:py-3.5 lg:py-4">
          <CardTitle className="text-base md:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 md:gap-3 lg:gap-4">
            {actions.map((action, index) => (
              <QuickActionButton key={action.title} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
