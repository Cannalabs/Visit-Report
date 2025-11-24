import React from 'react';
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy,
  Star,
  TrendingUp
} from "lucide-react";

export default function TopShops({ visits }) {
  // Calculate shop scores and rankings
  const shopScores = visits.reduce((acc, visit) => {
    if (!acc[visit.shop_name]) {
      acc[visit.shop_name] = {
        name: visit.shop_name,
        type: visit.shop_type,
        totalScore: 0,
        visitCount: 0,
        address: visit.shop_address
      };
    }
    
    acc[visit.shop_name].totalScore += visit.calculated_score || 0;
    acc[visit.shop_name].visitCount += 1;
    
    return acc;
  }, {});

  const topShops = Object.values(shopScores)
    .map(shop => ({
      ...shop,
      averageScore: shop.totalScore / shop.visitCount
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5);

  const getRankIcon = (index) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-orange-500" />;
    return <Star className="w-4 h-4 text-gray-400" />;
  };

  const getShopTypeColor = (type) => {
    const colors = {
      growshop: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      garden_center: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      nursery: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      hydroponics_store: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
      other: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
    };
    return colors[type] || colors.other;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="shadow-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 flex flex-col h-[284px] md:h-[314px] lg:h-[340px]">
        <CardHeader className="border-b border-white/10 dark:border-gray-700/30 px-4 md:px-5 lg:px-6 py-3 md:py-3.5 lg:py-4">
          <CardTitle className="text-base md:text-lg lg:text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
            Top Performing Shops
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-5 lg:p-6 flex-1 overflow-hidden">
          <div className={`space-y-3 md:space-y-3.5 lg:space-y-4 h-full ${topShops.length > 0 ? 'overflow-y-auto pr-2' : ''}`}>
            {topShops.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No shop data available yet
              </p>
            ) : (
              topShops.map((shop, index) => (
                <motion.div
                  key={shop.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex items-center justify-center w-8 h-8">
                    {getRankIcon(index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                      {shop.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getShopTypeColor(shop.type)}`}
                      >
                        {shop.type?.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {shop.visitCount} visit{shop.visitCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-bold text-lg text-green-600 dark:text-green-400">
                      {shop.averageScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">avg score</div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}