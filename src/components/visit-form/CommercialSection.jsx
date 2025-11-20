import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Star, AlertCircle, User, Calendar } from "lucide-react";
import { User as UserEntity } from "@/api/entities";

export default function CommercialSection({ formData, updateFormData }) {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      if (formData.follow_up_required) {
        setIsLoadingUsers(true);
        try {
          const userList = await UserEntity.list();
          setUsers(userList || []);
        } catch (error) {
          console.error("Failed to load users:", error);
        } finally {
          setIsLoadingUsers(false);
        }
      }
    };
    loadUsers();
  }, [formData.follow_up_required]);
  // Validation styles for required fields
  const getFieldStyle = (value, isRequired = false) => {
    if (isRequired && (!value || value === 0)) {
      return "border-red-300 bg-red-50 focus:border-red-500";
    }
    return "border-green-200 focus:border-green-500";
  };

  const renderRequiredAsterisk = () => (
    <span className="text-red-500 font-bold">*</span>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <DollarSign className="w-5 h-5" />
            Commercial Outcomes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="commercial_outcome" className="flex items-center gap-1">
                Commercial Result {renderRequiredAsterisk()}
              </Label>
              <Select
                value={formData.commercial_outcome || ""}
                onValueChange={(value) => updateFormData({ commercial_outcome: value })}
              >
                <SelectTrigger className={getFieldStyle(formData.commercial_outcome, true)}>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_order">New Order Taken</SelectItem>
                  <SelectItem value="order_commitment">Order Commitment Received</SelectItem>
                  <SelectItem value="price_negotiation">Price Negotiation</SelectItem>
                  <SelectItem value="complaint_resolved">Complaint Resolved</SelectItem>
                  <SelectItem value="information_only">Information Only</SelectItem>
                  <SelectItem value="no_outcome">No Commercial Outcome</SelectItem>
                </SelectContent>
              </Select>
              {!formData.commercial_outcome && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3 h-3" />
                  This field is required
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_value">Order Value (€)</Label>
              <Input
                id="order_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.order_value ?? ""}
                onChange={(e) => updateFormData({ order_value: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                className="border-green-200 focus:border-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            Shop Owner Satisfaction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="overall_satisfaction" className="flex items-center gap-1">
              Overall Satisfaction Rating (1-10) {renderRequiredAsterisk()}
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="overall_satisfaction"
                type="range"
                min="1"
                max="10"
                value={formData.overall_satisfaction ?? 5}
                onChange={(e) => updateFormData({ overall_satisfaction: parseInt(e.target.value) })}
                className={`flex-1 ${getFieldStyle(formData.overall_satisfaction, true)}`}
              />
              <div className="w-16 text-center font-bold text-lg text-yellow-600">
                {formData.overall_satisfaction ?? 5}/10
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Very Unsatisfied</span>
              <span>Very Satisfied</span>
            </div>
            {(!formData.overall_satisfaction || formData.overall_satisfaction === 0) && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                This field is required
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card id="follow-up-section" className="scroll-mt-8">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Follow-up Actions
            {formData.follow_up_required && !formData.follow_up_notes && (
              <Badge variant="destructive" className="ml-auto">
                Required - Notes Missing
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="follow_up_required">Follow-up Required</Label>
              <p className="text-sm text-gray-600">
                Does this visit require any follow-up actions?
              </p>
            </div>
            <Switch
              id="follow_up_required"
              checked={formData.follow_up_required || false}
              onCheckedChange={(checked) => updateFormData({ follow_up_required: checked })}
            />
          </div>

          {formData.follow_up_required && (
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
              {!formData.follow_up_notes && (
                <Alert variant="destructive" className="border-red-300 bg-red-50 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    <strong>Required:</strong> Follow-up notes are mandatory when follow-up is required. Please describe the required follow-up actions.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="follow_up_notes" className="flex items-center gap-1">
                  Follow-up Notes {renderRequiredAsterisk()}
                </Label>
                <Textarea
                  id="follow_up_notes"
                  value={formData.follow_up_notes || ""}
                  onChange={(e) => updateFormData({ follow_up_notes: e.target.value })}
                  placeholder="Describe the required follow-up actions..."
                  className={getFieldStyle(formData.follow_up_notes, formData.follow_up_required)}
                />
                {formData.follow_up_required && !formData.follow_up_notes && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This field is required when follow-up is enabled
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="follow_up_assigned_user_id" className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Assigned User
                  </Label>
                  <Select
                    value={formData.follow_up_assigned_user_id?.toString() || undefined}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        updateFormData({ follow_up_assigned_user_id: null });
                      } else {
                        updateFormData({ follow_up_assigned_user_id: value ? parseInt(value) : null });
                      }
                    }}
                    disabled={isLoadingUsers}
                  >
                    <SelectTrigger className="border-orange-200 focus:border-orange-500">
                      <SelectValue placeholder={isLoadingUsers ? "Loading..." : "Select user"} />
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="follow_up_stage" className="flex items-center gap-1">
                    Stage
                  </Label>
                  <Select
                    value={formData.follow_up_stage || undefined}
                    onValueChange={(value) => {
                      if (value === "__none__") {
                        updateFormData({ follow_up_stage: null });
                      } else {
                        updateFormData({ follow_up_stage: value || null });
                      }
                    }}
                  >
                    <SelectTrigger className="border-orange-200 focus:border-orange-500">
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

                <div className="space-y-2">
                  <Label htmlFor="follow_up_date" className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Follow-up Date
                  </Label>
                  <Input
                    id="follow_up_date"
                    type="date"
                    value={formData.follow_up_date ? new Date(formData.follow_up_date).toISOString().split('T')[0] : ""}
                    onChange={(e) => {
                      const dateValue = e.target.value;
                      updateFormData({ 
                        follow_up_date: dateValue ? new Date(dateValue).toISOString() : null 
                      });
                    }}
                    className="border-orange-200 focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}