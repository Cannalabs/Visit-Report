import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Phone, Mail, Briefcase, Info, AlertCircle, Clock, Calendar, Users, FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/api/entities";
import { Configuration } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

export default function ShopInfoSection({ formData, updateFormData }) {
  const [customers, setCustomers] = useState([]);
  const [visitPurposes, setVisitPurposes] = useState([]);
  const [hasVisitPurposeConfigs, setHasVisitPurposeConfigs] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [contactEditable, setContactEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [visitNotes, setVisitNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // If formData has a customer_id, find and select that customer
    if (formData.customer_id && customers.length > 0) {
      const customer = customers.find(c => c.id === formData.customer_id);
      if (customer) {
        setSelectedCustomer(customer);
        checkContactEditability(customer);
        setVisitNotes(customer.visit_notes || "");
      }
    }
  }, [formData.customer_id, customers]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customersData, configsData, usersData] = await Promise.all([
        Customer.list(),
        Configuration.list(),
        UserEntity.list().catch(() => []) // Load users for appointment assignment
      ]);
      
      const activeCustomers = customersData.filter(c => c.status === 'active');
      // Check if any visit purposes are configured at all (active or inactive)
      const allVisitPurposes = configsData.filter(c => c.config_type === 'visit_purposes');
      setHasVisitPurposeConfigs(allVisitPurposes.length > 0);
      
      // Only show active purposes
      const purposes = allVisitPurposes.filter(c => c.is_active);
      
      // Filter active users
      const activeUsers = usersData.filter(u => u.is_active !== false);
      
      setCustomers(activeCustomers);
      setVisitPurposes(purposes);
      setUsers(activeUsers);
    } catch (error) {
      // Failed to load data
    }
    setIsLoading(false);
  };

  const checkContactEditability = (customer) => {
    // Check if contact information is missing or incomplete
    const hasContactInfo = customer.contact_person || customer.contact_phone || customer.contact_email;
    setContactEditable(!hasContactInfo);
  };

  const handleShopSelection = async (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    setSelectedCustomer(customer);
    checkContactEditability(customer);
    setVisitNotes(customer.visit_notes || "");

    // Auto-fill all shop information
    updateFormData({
      customer_id: customer.id,
      shop_name: customer.shop_name,
      shop_type: customer.shop_type,
      shop_address: customer.shop_address,
      zipcode: customer.zipcode,
      city: customer.city,
      county: customer.county,
      contact_person: customer.contact_person || "",
      contact_phone: customer.contact_phone || "",
      contact_email: customer.contact_email || "",
      job_title: customer.job_title || "",
      opening_time: customer.opening_time || "",
      closing_time: customer.closing_time || ""
    });
  };

  const handleSaveVisitNotes = async () => {
    if (!selectedCustomer) return;
    
    setIsSavingNotes(true);
    try {
      await Customer.update(selectedCustomer.id, { visit_notes: visitNotes });
      // Update local customer state
      setSelectedCustomer({ ...selectedCustomer, visit_notes: visitNotes });
    } catch (err) {
      // Failed to save notes
    }
    setIsSavingNotes(false);
  };

  const handleContactUpdate = (field, value) => {
    if (contactEditable) {
      updateFormData({ [field]: value });
      
      // Update the customer record with new contact info
      if (selectedCustomer) {
        Customer.update(selectedCustomer.id, { [field]: value }).catch(() => {});
      }
    }
  };

  const getFieldStyle = (value, isRequired = false, isDisabled = false) => {
    if (isDisabled) {
      return "bg-gray-100 cursor-not-allowed border-gray-300";
    }
    if (isRequired && !value) {
      return "border-red-300 bg-red-50 focus:border-red-500";
    }
    return "border-green-200 focus:border-green-500";
  };

  const renderRequiredAsterisk = () => (
    <span className="text-red-500 font-bold">*</span>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Check for missing required fields
  const missingRequiredFields = [];
  if (!formData.customer_id) missingRequiredFields.push('Shop Selection');
  if (!formData.shop_name) missingRequiredFields.push('Shop Name');
  if (!formData.shop_type) missingRequiredFields.push('Shop Type');
  if (!formData.visit_purpose) missingRequiredFields.push('Visit Purpose');

  return (
    <div className="space-y-6">
      {missingRequiredFields.length > 0 && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Required fields missing:</strong> {missingRequiredFields.join(', ')}. Please fill in all required fields marked with <span className="text-red-500 font-bold">*</span>.
          </AlertDescription>
        </Alert>
      )}
      <Card className={`bg-green-50 ${missingRequiredFields.length > 0 ? 'border-red-300' : 'border-green-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Building2 className="w-5 h-5" />
            Shop Selection & Information
            {missingRequiredFields.length > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {missingRequiredFields.length} Required Field{missingRequiredFields.length > 1 ? 's' : ''} Missing
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer_select" className="flex items-center gap-1">
              Select Shop {renderRequiredAsterisk()}
            </Label>
            <Select
              value={formData.customer_id || ""}
              onValueChange={handleShopSelection}
            >
              <SelectTrigger className={getFieldStyle(formData.customer_id, true)}>
                <SelectValue placeholder="Choose from existing customers..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.shop_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!formData.customer_id && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                This field is required
              </p>
            )}
            <p className="text-xs text-green-600">
              Select from your existing customer database. Contact your admin to add new customers.
            </p>
          </div>

          {selectedCustomer && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-green-200">
                <div className="space-y-2">
                  <Label>Shop Name</Label>
                  <Input
                    value={formData.shop_name || ""}
                    disabled
                    className={getFieldStyle(null, false, true)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Shop Type</Label>
                  <Input
                    value={formData.shop_type?.replace('_', ' ') || ''}
                    disabled
                    className={getFieldStyle(null, false, true)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Shop Address</Label>
                <Input
                  value={formData.shop_address || ""}
                  disabled
                  className={getFieldStyle(null, false, true)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.zipcode || ""}
                    disabled
                    className={getFieldStyle(null, false, true)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.city || ""}
                    disabled
                    className={getFieldStyle(null, false, true)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>County</Label>
                  <Input
                    value={formData.county || ""}
                    disabled
                    className={getFieldStyle(null, false, true)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedCustomer && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Contact Information
              {contactEditable && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Editable - Missing Info
                </Badge>
              )}
              {!contactEditable && (
                <Badge variant="outline" className="border-green-300 text-green-700">
                  Auto-filled
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person || ""}
                  onChange={(e) => handleContactUpdate('contact_person', e.target.value)}
                  disabled={!contactEditable}
                  placeholder={contactEditable ? "Enter contact person name" : ""}
                  className={getFieldStyle(formData.contact_person, false, !contactEditable)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_title" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Job Title
                </Label>
                <Input
                  id="job_title"
                  value={formData.job_title || ""}
                  onChange={(e) => handleContactUpdate('job_title', e.target.value)}
                  disabled={!contactEditable}
                  placeholder={contactEditable ? "e.g., Store Manager" : ""}
                  className={getFieldStyle(formData.job_title, false, !contactEditable)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone || ""}
                  onChange={(e) => handleContactUpdate('contact_phone', e.target.value)}
                  disabled={!contactEditable}
                  placeholder={contactEditable ? "Contact phone number" : ""}
                  className={getFieldStyle(formData.contact_phone, false, !contactEditable)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email || ""}
                  onChange={(e) => handleContactUpdate('contact_email', e.target.value)}
                  disabled={!contactEditable}
                  placeholder={contactEditable ? "Contact email address" : ""}
                  className={getFieldStyle(formData.contact_email, false, !contactEditable)}
                />
              </div>
            </div>

            {contactEditable && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> You can edit contact information because no contact details 
                  were found for this customer. Your changes will be automatically saved to the customer database.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        </>
      )}

      {(formData.opening_time || formData.closing_time) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Shop Timings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                {formData.opening_time && formData.closing_time 
                  ? `${formData.opening_time} - ${formData.closing_time}`
                  : formData.opening_time 
                    ? `Opens at ${formData.opening_time}`
                    : `Closes at ${formData.closing_time}`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Visit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visit Status Selection */}
          <div className="space-y-2 pb-4 border-b border-green-200">
            <Label htmlFor="visit_status" className="flex items-center gap-1">
              Visit Type {renderRequiredAsterisk()}
            </Label>
            <Select
              value={formData.visit_status || "draft"}
              onValueChange={(value) => updateFormData({ visit_status: value })}
            >
              <SelectTrigger className={getFieldStyle(formData.visit_status, true)}>
                <SelectValue placeholder="Select visit status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appointment">Appointment - Plan a future visit</SelectItem>
                <SelectItem value="draft">Draft - Start documenting visit</SelectItem>
              </SelectContent>
            </Select>
            {!formData.visit_status && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                This field is required
              </p>
            )}
          </div>

          {/* Appointment Fields - Show when status is "appointment" */}
          {formData.visit_status === "appointment" && (
            <div className="space-y-4 pb-4 border-b border-blue-200 bg-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="assigned_user_id" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Assign to User/Employee
                </Label>
                <Select
                  value={formData.assigned_user_id?.toString() || ""}
                  onValueChange={(value) => updateFormData({ assigned_user_id: value ? parseInt(value) : null })}
                >
                  <SelectTrigger className={getFieldStyle(formData.assigned_user_id, false)}>
                    <SelectValue placeholder="Select user to assign this visit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.full_name || user.email} {user.role ? `(${user.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="planned_visit_date" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Planned Visit Date
                </Label>
                <Input
                  id="planned_visit_date"
                  type="date"
                  value={formData.planned_visit_date ? new Date(formData.planned_visit_date).toISOString().split('T')[0] : ""}
                  onChange={(e) => {
                    const dateValue = e.target.value ? new Date(e.target.value).toISOString() : null;
                    updateFormData({ planned_visit_date: dateValue });
                  }}
                  className={getFieldStyle(formData.planned_visit_date, false)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appointment_description">Appointment Description (Optional)</Label>
                <Textarea
                  id="appointment_description"
                  value={formData.appointment_description || ""}
                  onChange={(e) => updateFormData({ appointment_description: e.target.value })}
                  placeholder="Add notes about the planned visit, objectives, or special requirements..."
                  rows={3}
                  className={getFieldStyle(formData.appointment_description, false)}
                />
                <p className="text-xs text-gray-500">
                  Optional: Add planning notes, objectives, or special requirements for this appointment.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="visit_date" className="flex items-center gap-1">
                Visit Date {formData.visit_status !== "appointment" && renderRequiredAsterisk()}
              </Label>
              <Input
                id="visit_date"
                type="date"
                max={formData.visit_status !== "appointment" ? new Date().toISOString().split('T')[0] : undefined}
                value={
                  formData.visit_status === "appointment" && formData.planned_visit_date
                    ? new Date(formData.planned_visit_date).toISOString().split('T')[0]
                    : (formData.visit_date || "")
                }
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  // For non-appointment visits, validate that date is not in the future
                  if (formData.visit_status !== "appointment" && selectedDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const selected = new Date(selectedDate);
                    selected.setHours(0, 0, 0, 0);
                    
                    if (selected > today) {
                      // Don't update if future date is selected
                      return;
                    }
                  }
                  updateFormData({ visit_date: selectedDate });
                }}
                className={getFieldStyle(
                  formData.visit_status === "appointment" && formData.planned_visit_date
                    ? new Date(formData.planned_visit_date).toISOString().split('T')[0]
                    : formData.visit_date,
                  formData.visit_status !== "appointment"
                )}
                disabled={formData.visit_status === "appointment"}
              />
              <div className="min-h-[20px]">
                {formData.visit_status === "appointment" && formData.planned_visit_date && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Visit date matches planned visit date
                  </p>
                )}
                {formData.visit_status === "appointment" && !formData.planned_visit_date && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Set planned visit date above to auto-fill visit date
                  </p>
                )}
                {formData.visit_status !== "appointment" && !formData.visit_date && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    This field is required
                  </p>
                )}
                {formData.visit_status !== "appointment" && formData.visit_date && (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const selected = new Date(formData.visit_date);
                  selected.setHours(0, 0, 0, 0);
                  if (selected > today) {
                    return (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Visit date cannot be in the future. Use "Planned Visit" status for future visits.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
            
            <div className="space-y-2 flex flex-col">
              <Label htmlFor="visit_duration">Duration (minutes)</Label>
              <Input
                id="visit_duration"
                type="number"
                min="1"
                value={formData.visit_duration ?? ""}
                onChange={(e) => updateFormData({ visit_duration: parseInt(e.target.value) || 0 })}
                className="h-9 border-green-200 focus:border-green-500"
              />
              <div className="min-h-[20px]"></div>
            </div>
            
            <div className="space-y-2 flex flex-col">
            <Label htmlFor="visit_purpose" className="flex items-center gap-1">
              Visit Purpose {renderRequiredAsterisk()}
            </Label>
            {hasVisitPurposeConfigs && visitPurposes.length === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50 mb-2">
                <AlertDescription className="text-yellow-800">
                  All visit purposes are currently inactive. Please enable visit purposes from the Configuration page.
                </AlertDescription>
              </Alert>
            )}
            <Select
              value={formData.visit_purpose || ""}
              onValueChange={(value) => updateFormData({ visit_purpose: value })}
              disabled={hasVisitPurposeConfigs && visitPurposes.length === 0}
            >
              <SelectTrigger className={getFieldStyle(formData.visit_purpose, true)} disabled={hasVisitPurposeConfigs && visitPurposes.length === 0}>
                <SelectValue placeholder={hasVisitPurposeConfigs && visitPurposes.length === 0 ? "No active visit purposes available" : "Select purpose"} />
              </SelectTrigger>
              <SelectContent>
                {visitPurposes.length > 0 ? (
                  visitPurposes.map((purpose) => (
                    <SelectItem key={purpose.id} value={purpose.config_value}>
                      {purpose.config_name}
                    </SelectItem>
                  ))
                ) : hasVisitPurposeConfigs ? (
                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                    No active visit purposes available
                  </div>
                ) : (
                  // Fallback if no configurations exist at all
                  <>
                    <SelectItem value="routine_check">Routine Check</SelectItem>
                    <SelectItem value="training">Training Session</SelectItem>
                    <SelectItem value="promotion">Product Promotion</SelectItem>
                    <SelectItem value="complaint_resolution">Complaint Resolution</SelectItem>
                    <SelectItem value="new_products">New Products Introduction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <div className="min-h-[20px]">
              {!formData.visit_purpose && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This field is required
                </p>
              )}
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {selectedCustomer && (
        <>
          {/* Visit Notes from Past Reports */}
          <Card className="bg-amber-50/50 border-amber-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-800 text-base">
              <FileText className="w-4 h-4" />
              Notes for This Visit
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedCustomer.visit_notes ? (
              <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 mb-3">
                <p className="text-sm text-amber-900 whitespace-pre-line font-medium">
                  {selectedCustomer.visit_notes}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-3">
                <p className="text-sm text-gray-500 italic">
                  No notes available for this shop. Add notes below to help with future visits.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="visit_notes" className="text-sm font-semibold">Update Visit Notes</Label>
              <Textarea
                id="visit_notes"
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Add notes for future visits (e.g., 'Bring new samples on next visit', 'Customer requested product demo', etc.)"
                rows={4}
                className="border-amber-200 focus:border-amber-400"
              />
              <Button
                onClick={handleSaveVisitNotes}
                disabled={isSavingNotes || visitNotes === (selectedCustomer.visit_notes || "")}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingNotes ? "Saving..." : "Save Notes"}
              </Button>
            </div>
          </CardContent>
        </Card>
        </>
      )}
    </div>
  );
}