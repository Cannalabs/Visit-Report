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
  Edit,
  Eye
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
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-0">
        {selectedVisits.length > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedVisits.length} visit(s) selected
            </span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 h-8"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50 hover:bg-gray-50/50 border-b border-gray-200">
                <TableHead className="w-12 text-center py-4">
                  <Checkbox
                    checked={selectedVisits.length === visits.length && visits.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead className="min-w-[220px] py-4 font-semibold text-gray-700">Shop Details</TableHead>
                <TableHead className="min-w-[160px] py-4 font-semibold text-gray-700">Visit Info</TableHead>
                <TableHead className="min-w-[110px] py-4 font-semibold text-gray-700">Score</TableHead>
                <TableHead className="min-w-[130px] py-4 font-semibold text-gray-700">Commercial</TableHead>
                <TableHead className="min-w-[140px] py-4 font-semibold text-gray-700">Status</TableHead>
                <TableHead className="min-w-[110px] text-right py-4 font-semibold text-gray-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Building2 className="w-14 h-14 text-gray-300" />
                      <p className="text-gray-500 font-medium">No visits found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                visits.map((visit) => (
                  <TableRow key={visit.id} className="hover:bg-gray-50/50 border-b border-gray-100 transition-colors">
                    <TableCell className="text-center py-4">
                      <Checkbox
                        checked={selectedVisits.includes(visit.id)}
                        onCheckedChange={(checked) => handleSelectOne(visit.id, checked)}
                        disabled={!canDeleteVisit(visit)}
                      />
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-2.5">
                        <Link to={createPageUrl(`NewVisit?id=${visit.id}`)}>
                          <div className="font-semibold text-gray-900 hover:text-green-600 hover:underline transition-colors text-base">
                            {visit.shop_name}
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`${getShopTypeColor(visit.shop_type)} text-xs font-medium px-2 py-0.5`}
                          >
                            {visit.shop_type?.replace('_', ' ')}
                          </Badge>
                          {visit.visit_status ? (
                            visit.visit_status === "done" ? (
                              <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs font-medium px-2 py-0.5">
                                Done
                              </Badge>
                            ) : visit.visit_status === "appointment" ? (
                              <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-xs font-medium px-2 py-0.5">
                                Appointment
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-xs font-medium px-2 py-0.5">
                                Draft
                              </Badge>
                            )
                          ) : visit.is_draft ? (
                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-xs font-medium px-2 py-0.5">
                              Draft
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-xs font-medium px-2 py-0.5">
                              Submitted
                            </Badge>
                          )}
                        </div>
                        {visit.shop_address && (
                          <div className="flex items-start gap-1.5 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[220px] leading-relaxed">
                              {visit.shop_address}
                            </span>
                          </div>
                        )}
                        {visit.contact_person && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="leading-relaxed">{visit.contact_person}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-900">
                          {visit.visit_date ? (() => {
                            try {
                              const date = new Date(visit.visit_date);
                              return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d, yyyy');
                            } catch (e) {
                              return 'Invalid date';
                            }
                          })() : 'No date'}
                        </div>
                        <div className="text-sm text-gray-600 capitalize font-medium">
                          {visit.visit_purpose?.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {visit.visit_duration}min
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className={`text-xl font-bold ${getScoreColor(visit.calculated_score)}`}>
                          {visit.calculated_score?.toFixed(1) || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{visit.overall_satisfaction}/10</span>
                        </div>
                        {visit.priority_level && (
                          <Badge
                            variant="secondary"
                            className={`${getPriorityColor(visit.priority_level)} text-xs font-medium px-2 py-0.5 capitalize`}
                          >
                            {visit.priority_level}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-900 capitalize">
                          {visit.commercial_outcome?.replace('_', ' ') || 'N/A'}
                        </div>
                        {visit.order_value > 0 && (
                          <div className="text-sm text-green-600 font-bold">
                            €{visit.order_value.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {visit.follow_up_required && (
                            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-xs font-medium px-2 py-0.5">
                              <AlertCircle className="w-3 h-3 mr-1 inline" />
                              Follow-up
                            </Badge>
                          )}
                          {visit.follow_up_stage && (
                            <Badge variant="secondary" className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-200">
                              {visit.follow_up_stage.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {visit.follow_up_date && (
                          <div className="text-xs text-blue-600 font-medium">
                            {(() => {
                              try {
                                const date = new Date(visit.follow_up_date);
                                return isNaN(date.getTime()) ? '' : format(date, 'MMM d, yyyy');
                              } catch (e) {
                                return '';
                              }
                            })()}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
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

                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={createPageUrl(`NewVisit?id=${visit.id}`)}>
                          {visit.is_draft ? (
                            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 border-gray-200 hover:bg-gray-50">
                              <Edit className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="flex items-center gap-1.5 h-8 px-3 border-gray-200 hover:bg-gray-50">
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                          )}
                        </Link>
                        {canDeleteVisit(visit) && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDelete(visit.id)}
                            className="h-8 w-8 p-0 border-gray-200 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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