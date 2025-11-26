import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ReportFilters({ filters, onFiltersChange, shopTypes = [] }) {
  const updateFilter = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Date Range</Label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => updateFilter('dateRange', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Shop Type</Label>
        <Select
          value={filters.shopType}
          onValueChange={(value) => updateFilter('shopType', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {shopTypes.length > 0 ? (
              shopTypes.map((shopType) => (
                <SelectItem key={shopType.config_value} value={shopType.config_value}>
                  {shopType.config_name}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="growshop">Growshop</SelectItem>
                <SelectItem value="garden_center">Garden Center</SelectItem>
                <SelectItem value="nursery">Nursery</SelectItem>
                <SelectItem value="hydroponics_store">Hydroponics Store</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Priority Level</Label>
        <Select
          value={filters.priority}
          onValueChange={(value) => updateFilter('priority', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Follow-up Status</Label>
        <Select
          value={filters.followUp}
          onValueChange={(value) => updateFilter('followUp', value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visits</SelectItem>
            <SelectItem value="required">Follow-up Required</SelectItem>
            <SelectItem value="none">No Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Visit Types</Label>
        <Select
          value={
            filters.showAll 
              ? "all" 
              : filters.showFollowUp && filters.showPlanned 
              ? "both" 
              : filters.showFollowUp 
              ? "followup" 
              : filters.showPlanned 
              ? "planned" 
              : "none"
          }
          onValueChange={(value) => {
            if (value === "all") {
              updateFilter('showAll', true);
              updateFilter('showFollowUp', true);
              updateFilter('showPlanned', true);
            } else if (value === "both") {
              updateFilter('showAll', false);
              updateFilter('showFollowUp', true);
              updateFilter('showPlanned', true);
            } else if (value === "followup") {
              updateFilter('showAll', false);
              updateFilter('showFollowUp', true);
              updateFilter('showPlanned', false);
            } else if (value === "planned") {
              updateFilter('showAll', false);
              updateFilter('showFollowUp', false);
              updateFilter('showPlanned', true);
            } else {
              updateFilter('showAll', false);
              updateFilter('showFollowUp', false);
              updateFilter('showPlanned', false);
            }
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visits</SelectItem>
            <SelectItem value="both">Follow-up & Planned</SelectItem>
            <SelectItem value="followup">Follow-up Only</SelectItem>
            <SelectItem value="planned">Planned Only</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}