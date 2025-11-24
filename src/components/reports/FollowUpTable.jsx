import React, { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertCircle,
  User,
  Building2,
  Trash2,
  Edit,
  Eye,
  Calendar,
  FileText,
  Save,
  X
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ShopVisit } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";

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

const getStageColor = (stage) => {
  const colors = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    in_progress: "bg-blue-100 text-blue-800 border-blue-200",
    completed: "bg-green-100 text-green-800 border-green-200",
    cancelled: "bg-red-100 text-red-800 border-red-200"
  };
  return colors[stage] || "bg-gray-100 text-gray-800 border-gray-200";
};

export default function FollowUpTable({ visits, isLoading, selectedVisits, onSelectionChange, onRefresh, currentUser }) {
  const [users, setUsers] = useState([]);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await UserEntity.list();
        setUsers(userList || []);
      } catch (error) {
        console.error("Failed to load users:", error);
      }
    };
    loadUsers();
  }, []);

  const getUserName = (userId) => {
    if (!userId) return null;
    const user = users.find(u => u.id === userId);
    return user ? (user.full_name || user.email) : null;
  };

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
        alert("Failed to delete some visit reports. Please try again.");
      }
    }
  };

  const canDeleteVisit = (visit) => {
    return visit.is_draft || !visit.is_finalized;
  };

  // Check if current user can edit follow-up fields
  const canEditFollowUp = (visit) => {
    if (!currentUser || !visit) return false;
    const isCreator = visit.created_by === currentUser.id;
    const isAssignedUser = visit.follow_up_assigned_user_id === currentUser.id;
    return isCreator || isAssignedUser;
  };

  const handleEdit = (visit) => {
    setEditingRow(visit.id);
    setEditData({
      follow_up_notes: visit.follow_up_notes || "",
      follow_up_assigned_user_id: visit.follow_up_assigned_user_id || null,
      follow_up_stage: visit.follow_up_stage || null,
      follow_up_date: visit.follow_up_date ? new Date(visit.follow_up_date).toISOString().split('T')[0] : ""
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveEdit = async (visitId) => {
    setIsSaving(true);
    try {
      const updateData = {
        follow_up_notes: editData.follow_up_notes || null,
        follow_up_assigned_user_id: editData.follow_up_assigned_user_id || null,
        follow_up_stage: editData.follow_up_stage || null,
        follow_up_date: editData.follow_up_date ? new Date(editData.follow_up_date).toISOString() : null
      };
      
      await ShopVisit.update(visitId, updateData);
      setEditingRow(null);
      setEditData({});
      if (onRefresh) onRefresh();
    } catch (error) {
      alert("Failed to update follow-up. Please try again.");
      console.error("Error updating follow-up:", error);
    } finally {
      setIsSaving(false);
    }
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
          <div className="px-4 sm:px-6 py-3 bg-gray-50 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {selectedVisits.length} visit(s) selected
            </span>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 w-full sm:w-auto text-sm"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}
        
        {/* Mobile & Tablet Card View */}
        <div className="lg:hidden p-4 space-y-3">
          {visits.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Building2 className="w-14 h-14 text-gray-300" />
              <p className="text-gray-500 font-medium text-sm">No follow-up visits found</p>
            </div>
          ) : (
            visits.map((visit) => (
              <Card key={visit.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedVisits.includes(visit.id)}
                      onCheckedChange={(checked) => handleSelectOne(visit.id, checked)}
                      disabled={!canDeleteVisit(visit)}
                      className="mt-1 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <Link to={createPageUrl(`NewVisit?id=${visit.id}`)} className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 hover:text-green-600 transition-colors text-base truncate">
                            {visit.shop_name}
                          </div>
                        </Link>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="text-xs text-gray-500">
                            {visit.visit_date ? (() => {
                              try {
                                const date = new Date(visit.visit_date);
                                return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d');
                              } catch (e) {
                                return 'Invalid date';
                              }
                            })() : 'No date'}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {visit.visit_purpose?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={`${getShopTypeColor(visit.shop_type)} text-xs font-medium px-2 py-0.5`}
                        >
                          {visit.shop_type?.replace('_', ' ')}
                        </Badge>
                        {visit.follow_up_stage ? (
                          <Badge variant="secondary" className={`${getStageColor(visit.follow_up_stage)} text-xs font-medium px-2 py-0.5`}>
                            {visit.follow_up_stage.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-0.5">
                            Not set
                          </Badge>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-1.5">
                        {visit.shop_address && (
                          <div className="flex items-start gap-1.5 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="line-clamp-1">{visit.shop_address}</span>
                          </div>
                        )}
                        {visit.contact_person && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span>{visit.contact_person}</span>
                          </div>
                        )}
                      </div>

                      {/* Follow-up Notes */}
                      <div className="pt-2 border-t border-gray-100">
                        <div className="text-xs font-medium text-gray-700 mb-1">Follow-up Notes:</div>
                        {editingRow === visit.id && canEditFollowUp(visit) ? (
                          <Textarea
                            value={editData.follow_up_notes || ""}
                            onChange={(e) => setEditData({...editData, follow_up_notes: e.target.value})}
                            placeholder="Enter follow-up notes..."
                            className="text-sm min-h-[60px]"
                            rows={2}
                          />
                        ) : (
                          <div className="text-sm text-gray-600">
                            {visit.follow_up_notes ? (
                              <div className="flex items-start gap-1">
                                <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-gray-400" />
                                <span className="line-clamp-2">{visit.follow_up_notes}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No notes</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Assigned User & Follow-up Date */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Assigned:</div>
                          {editingRow === visit.id && canEditFollowUp(visit) ? (
                            <Select
                              value={editData.follow_up_assigned_user_id?.toString() || "__none__"}
                              onValueChange={(value) => {
                                setEditData({
                                  ...editData,
                                  follow_up_assigned_user_id: value === "__none__" ? null : parseInt(value)
                                });
                              }}
                            >
                              <SelectTrigger className="w-full text-xs h-8">
                                <SelectValue placeholder="Select user" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">None</SelectItem>
                                {users.map((user) => (
                                  <SelectItem key={user.id} value={user.id.toString()}>
                                    {user.full_name || user.email}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-xs text-gray-600">
                              {visit.follow_up_assigned_user_id ? (
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-gray-400" />
                                  <span className="truncate">{getUserName(visit.follow_up_assigned_user_id) || `User ID: ${visit.follow_up_assigned_user_id}`}</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Not assigned</span>
                              )}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Follow-up Date:</div>
                          {editingRow === visit.id && canEditFollowUp(visit) ? (
                            <Input
                              type="date"
                              value={editData.follow_up_date || ""}
                              onChange={(e) => setEditData({...editData, follow_up_date: e.target.value})}
                              className="w-full text-xs h-8"
                            />
                          ) : (
                            <div className="text-xs text-gray-600">
                              {visit.follow_up_date ? (
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <span>
                                    {(() => {
                                      try {
                                        const date = new Date(visit.follow_up_date);
                                        return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d');
                                      } catch (e) {
                                        return 'Invalid date';
                                      }
                                    })()}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Not set</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Stage (if editing) */}
                      {editingRow === visit.id && canEditFollowUp(visit) && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-xs font-medium text-gray-700 mb-1">Stage:</div>
                          <Select
                            value={editData.follow_up_stage || "__none__"}
                            onValueChange={(value) => {
                              setEditData({
                                ...editData,
                                follow_up_stage: value === "__none__" ? null : value
                              });
                            }}
                          >
                            <SelectTrigger className="w-full text-xs h-8">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">None</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        {editingRow === visit.id && canEditFollowUp(visit) ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveEdit(visit.id)}
                              disabled={isSaving}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-xs h-8"
                            >
                              <Save className="w-3 h-3" />
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="flex items-center gap-1 text-xs h-8"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {canEditFollowUp(visit) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(visit)}
                                className="flex items-center gap-1 text-xs h-8"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </Button>
                            )}
                            <Link to={createPageUrl(`NewVisit?id=${visit.id}&section=3&highlight=followup`)}>
                              {visit.is_draft ? (
                                <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs h-8">
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="flex items-center gap-1 text-xs h-8">
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                              )}
                            </Link>
                            {canDeleteVisit(visit) && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDelete(visit.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
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
                <TableHead>Follow-up Notes</TableHead>
                <TableHead>Assigned User</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Follow-up Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Building2 className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No follow-up visits found</p>
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
                      </div>
                    </TableCell>

                    <TableCell>
                      {editingRow === visit.id && canEditFollowUp(visit) ? (
                        <Textarea
                          value={editData.follow_up_notes || ""}
                          onChange={(e) => setEditData({...editData, follow_up_notes: e.target.value})}
                          placeholder="Enter follow-up notes..."
                          className="min-w-[200px] max-w-xs text-sm"
                          rows={2}
                        />
                      ) : (
                        <div className="max-w-xs">
                          {visit.follow_up_notes ? (
                            <div className="flex items-start gap-1 text-sm text-gray-700">
                              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                              <span className="line-clamp-2">{visit.follow_up_notes}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400 italic">No notes</span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {editingRow === visit.id && canEditFollowUp(visit) ? (
                        <Select
                          value={editData.follow_up_assigned_user_id?.toString() || "__none__"}
                          onValueChange={(value) => {
                            setEditData({
                              ...editData,
                              follow_up_assigned_user_id: value === "__none__" ? null : parseInt(value)
                            });
                          }}
                        >
                          <SelectTrigger className="w-[180px] text-sm">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        visit.follow_up_assigned_user_id ? (
                          <div className="flex items-center gap-1 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{getUserName(visit.follow_up_assigned_user_id) || `User ID: ${visit.follow_up_assigned_user_id}`}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not assigned</span>
                        )
                      )}
                    </TableCell>

                    <TableCell>
                      {editingRow === visit.id && canEditFollowUp(visit) ? (
                        <Select
                          value={editData.follow_up_stage || "__none__"}
                          onValueChange={(value) => {
                            setEditData({
                              ...editData,
                              follow_up_stage: value === "__none__" ? null : value
                            });
                          }}
                        >
                          <SelectTrigger className="w-[150px] text-sm">
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        visit.follow_up_stage ? (
                          <Badge variant="secondary" className={getStageColor(visit.follow_up_stage)}>
                            {visit.follow_up_stage.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )
                      )}
                    </TableCell>

                    <TableCell>
                      {editingRow === visit.id && canEditFollowUp(visit) ? (
                        <Input
                          type="date"
                          value={editData.follow_up_date || ""}
                          onChange={(e) => setEditData({...editData, follow_up_date: e.target.value})}
                          className="w-[150px] text-sm"
                        />
                      ) : (
                        visit.follow_up_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>
                              {(() => {
                                try {
                                  const date = new Date(visit.follow_up_date);
                                  return isNaN(date.getTime()) ? 'Invalid date' : format(date, 'MMM d, yyyy');
                                } catch (e) {
                                  return 'Invalid date';
                                }
                              })()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Not set</span>
                        )
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {editingRow === visit.id && canEditFollowUp(visit) ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleSaveEdit(visit.id)}
                              disabled={isSaving}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="w-3 h-3" />
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                              className="flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {canEditFollowUp(visit) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(visit)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="w-3 h-3" />
                                Edit
                              </Button>
                            )}
                            <Link to={createPageUrl(`NewVisit?id=${visit.id}&section=3&highlight=followup`)}>
                              {visit.is_draft ? (
                                <Button size="sm" variant="outline" className="flex items-center gap-1">
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline" className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                              )}
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
                          </>
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

