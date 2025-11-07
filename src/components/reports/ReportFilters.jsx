import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ReportFilters({ filters, onFiltersChange }) {
  const updateFilter = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="space-y-2">
        <Label>Date Range</Label>
        <Select
          value={filters.dateRange}
          onValueChange={(value) => updateFilter('dateRange', value)}
        >
          <SelectTrigger>
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
        <Label>Shop Type</Label>
        <Select
          value={filters.shopType}
          onValueChange={(value) => updateFilter('shopType', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="growshop">Growshop</SelectItem>
            <SelectItem value="garden_center">Garden Center</SelectItem>
            <SelectItem value="nursery">Nursery</SelectItem>
            <SelectItem value="hydroponics_store">Hydroponics Store</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Priority Level</Label>
        <Select
          value={filters.priority}
          onValueChange={(value) => updateFilter('priority', value)}
        >
          <SelectTrigger>
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
        <Label>Follow-up Status</Label>
        <Select
          value={filters.followUp}
          onValueChange={(value) => updateFilter('followUp', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Visits</SelectItem>
            <SelectItem value="required">Follow-up Required</SelectItem>
            <SelectItem value="none">No Follow-up</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}