
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

const QuickActionButton = ({ icon: Icon, title, description, to, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay }}
  >
    <Link to={to}>
      <Button
        variant="outline"
        className={`w-full h-auto p-4 flex-col gap-2 hover:${color} hover:text-white transition-all duration-200 group`}
      >
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')} group-hover:text-white`} />
        <div className="text-center">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-gray-500 group-hover:text-white/80">
            {description}
          </div>
        </div>
      </Button>
    </Link>
  </motion.div>
);

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
      to: createPageUrl("NewVisit"),
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
      <Card className="shadow-lg">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {actions.map((action, index) => (
              <QuickActionButton key={action.title} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
