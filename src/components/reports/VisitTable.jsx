import React from 'react';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  MapPin,
  Star,
  AlertCircle,
  User,
  Building2,
  Trash2,
  Edit
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShopVisit } from "@/api/entities";

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

const getScoreColor = (score) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

export default function VisitTable({ visits, isLoading, selectedVisits, onSelectionChange, onRefresh }) {
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(visits.map(v => v.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      onSelectionChange([...selectedVisits, id]);
    } else {
      onSelectionChange(selectedVisits.filter(vid => vid !== id));
    }
  };

  const handleDelete = async (visitId) => {
    if (window.confirm("Are you sure you want to delete this visit report? This action cannot be undone.")) {
      try {
        await ShopVisit.delete(visitId);
        if (onRefresh) onRefresh();
      } catch (error) {
        // Failed to delete visit
        alert("Failed to delete visit report. Please try again.");
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVisits.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedVisits.length} visit report(s)? This action cannot be undone.`)) {
      try {
        await Promise.all(selectedVisits.map(id => ShopVisit.delete(id)));
        onSelectionChange([]);
        if (onRefresh) onRefresh();
      } catch (error) {
        // Failed to delete visits
        alert("Failed to delete some visit reports. Please try again.");
      }
    }
  };

  // Check if visit can be deleted (only drafts and non-finalized reports)
  const canDeleteVisit = (visit) => {
    return visit.is_draft || !visit.is_finalized;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {selectedVisits.length > 0 && (
          <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedVisits.length} visit(s) selected
            </span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedVisits.length === visits.length && visits.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Shop Details</TableHead>
                <TableHead>Visit Info</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Commercial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Building2 className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No visits found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.id} className="hover:bg-gray-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedVisits.includes(visit.id)}
                        onCheckedChange={(checked) => handleSelectOne(visit.id, checked)}
                        disabled={!canDeleteVisit(visit)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Link to={createPageUrl(`NewVisit?id=${visit.id}`)}>
                          <div className="font-semibold text-gray-900 hover:text-green-700 hover:underline">
                            {visit.shop_name}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={getShopTypeColor(visit.shop_type)}
                          >
                            {visit.shop_type?.replace('_', ' ')}
                          </Badge>
                          {visit.is_draft && (
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              Draft
                            </Badge>
                          )}
                        </div>
                        {visit.shop_address && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">
                              {visit.shop_address}
                            </span>
                          </div>
                        )}
                        {visit.contact_person && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <User className="w-3 h-3" />
                            <span>{visit.contact_person}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {visit.visit_date ? (() => {
                            try {
                              const date = new Date(visit.visit_date);
                              return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d, yyyy');
                            } catch (e) {
                              return 'Invalid date';
                            }
                          })() : 'No date'}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {visit.visit_purpose?.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-400">
                          {visit.visit_duration}min
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className={`text-lg font-bold ${getScoreColor(visit.calculated_score)}`}>
                          {visit.calculated_score?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span>{visit.overall_satisfaction}/10</span>
                        </div>
                        {visit.priority_level && (
                          <Badge
                            variant="secondary"
                            className={getPriorityColor(visit.priority_level)}
                          >
                            {visit.priority_level}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium capitalize">
                          {visit.commercial_outcome?.replace('_', ' ') || 'N/A'}
                        </div>
                        {visit.order_value > 0 && (
                          <div className="text-sm text-green-600 font-semibold">
                            €{visit.order_value.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        {visit.follow_up_required && (
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Follow-up
                          </Badge>
                        )}
                        <div className="text-xs text-gray-400">
                          {visit.created_date ? (() => {
                            try {
                              const date = new Date(visit.created_date);
                              return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d');
                            } catch (e) {
                              return 'Invalid date';
                            }
                          })() : 'No date'}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link to={createPageUrl(`NewVisit?id=${visit.id}`)}>
                          <Button size="sm" variant="outline" className="flex items-center gap-1">
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                        </Link>
                        {canDeleteVisit(visit) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDelete(visit.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}