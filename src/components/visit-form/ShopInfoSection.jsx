import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Phone, Mail, Briefcase, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/api/entities";
import { Configuration } from "@/api/entities";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ShopInfoSection({ formData, updateFormData }) {
  const [customers, setCustomers] = useState([]);
  const [visitPurposes, setVisitPurposes] = useState([]);
  const [hasVisitPurposeConfigs, setHasVisitPurposeConfigs] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [contactEditable, setContactEditable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
      }
    }
  }, [formData.customer_id, customers]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [customersData, configsData] = await Promise.all([
        Customer.list(),
        Configuration.list()
      ]);
      
      const activeCustomers = customersData.filter(c => c.status === 'active');
      // Check if any visit purposes are configured at all (active or inactive)
      const allVisitPurposes = configsData.filter(c => c.config_type === 'visit_purposes');
      setHasVisitPurposeConfigs(allVisitPurposes.length > 0);
      
      // Only show active purposes
      const purposes = allVisitPurposes.filter(c => c.is_active);
      
      setCustomers(activeCustomers);
      setVisitPurposes(purposes);
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
      job_title: customer.job_title || ""
    });
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

  return (
    <div className="space-y-6">
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Building2 className="w-5 h-5" />
            Shop Selection & Information
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
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Visit Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="visit_date" className="flex items-center gap-1">
              Visit Date {renderRequiredAsterisk()}
            </Label>
            <Input
              id="visit_date"
              type="date"
              value={formData.visit_date || ""}
              onChange={(e) => updateFormData({ visit_date: e.target.value })}
              className={getFieldStyle(formData.visit_date, true)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="visit_duration">Duration (minutes)</Label>
            <Input
              id="visit_duration"
              type="number"
              min="1"
              value={formData.visit_duration ?? ""}
              onChange={(e) => updateFormData({ visit_duration: parseInt(e.target.value) || 0 })}
              className="border-green-200 focus:border-green-500"
            />
          </div>
          
          <div className="space-y-2">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}