
import React, { useState, useEffect, useRef } from "react";
import { ShopVisit } from "@/api/entities";
import { User } from "@/api/entities";
import { Customer } from "@/api/entities";
import { UploadFile, InvokeLLM } from "@/api/integrations";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Camera,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Mic,
  Download,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import ShopInfoSection from "../components/visit-form/ShopInfoSection";
import ProductVisibilitySection from "../components/visit-form/ProductVisibilitySection";
import TrainingSection from "../components/visit-form/TrainingSection";
import CommercialSection from "../components/visit-form/CommercialSection";
import PhotoSection from "../components/visit-form/PhotoSection";
import SignatureSection from "../components/visit-form/SignatureSection";
import FormProgress from "../components/visit-form/FormProgress";
import { generateVisitReportPDF } from "../components/pdf/generateVisitReportPDF";

export default function NewVisit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [visitId, setVisitId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDraftCreated, setIsDraftCreated] = useState(false); // Prevent duplicate draft creation
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPreSubmitChecklist, setShowPreSubmitChecklist] = useState(false);
  const [user, setUser] = useState(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [checklistItems, setChecklistItems] = useState({
    photosAttached: false,
    questionnaireComplete: false,
    followUpAdded: false,
    signatureAttached: false
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null); // New state for selected customer

  const autoSaveIntervalRef = useRef(null);

  const [formData, setFormData] = useState({
    // customer_id is no longer initialized here; it's set dynamically upon customer selection/loading
    shop_name: "",
    shop_type: "",
    shop_address: "",
    zipcode: "",
    city: "",
    county: "",
    contact_person: "",
    contact_phone: "",
    contact_email: "",
    job_title: "",
    visit_date: new Date().toISOString().split('T')[0],
    visit_duration: 60,
    visit_purpose: "",
    product_visibility_score: 50,
    products_discussed: [],
    competitor_presence: "",
    training_provided: false,
    training_topics: [],
    support_materials_required: false,
    support_materials_items: [],
    support_materials_other_text: "",
    commercial_outcome: "",
    order_value: 0,
    overall_satisfaction: 5,
    follow_up_required: false,
    follow_up_notes: "",
    notes: "",
    visit_photos: [],
    gps_coordinates: null,
    signature: null,
    signature_signer_name: null,
    signature_date: null,
    sales_data: {}, // Sales and purchase breakdown data
    is_draft: false
  });

  // Auto-update checklist when formData changes
  useEffect(() => {
    const hasPhotos = formData.visit_photos && formData.visit_photos.length > 0;
    const isComplete = formData.customer_id && formData.shop_name && formData.shop_type && formData.visit_purpose;
    const hasFollowUp = formData.follow_up_required ? formData.follow_up_notes && formData.follow_up_notes.length > 0 : true;
    const hasSignature = !!formData.signature && !!formData.signature_signer_name && !!formData.signature_date;

    setChecklistItems({
      photosAttached: hasPhotos,
      questionnaireComplete: isComplete,
      followUpAdded: hasFollowUp,
      signatureAttached: hasSignature
    });
  }, [formData.visit_photos, formData.customer_id, formData.shop_name, formData.shop_type, formData.visit_purpose, formData.follow_up_required, formData.follow_up_notes, formData.signature, formData.signature_signer_name, formData.signature_date]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const customerId = params.get('customer_id'); // Get customer_id from URL params

    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        // Check for token before making API calls
        const token = localStorage.getItem('access_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Try to get user from cache first
        let currentUser = null;
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          try {
            currentUser = JSON.parse(cachedUser);
            setUser(currentUser);
          } catch (e) {
            // Invalid cache, will fetch fresh
          }
        }

        // Fetch fresh user data, fallback to cached if it fails
        try {
          const freshUser = await User.me();
          if (freshUser) {
            currentUser = freshUser;
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
        } catch (error) {
          // Use cached user if API call fails
        }

        if (id) {
          setVisitId(id);
          setIsDraftCreated(true); // Already has an ID
          await loadVisitData(id);
        } else if (customerId) { // If a customer_id is provided, pre-fill form
          const customers = await Customer.filter({ id: customerId });
          const customer = customers.length > 0 ? customers[0] : null;
          if (customer) {
            setSelectedCustomer(customer);
            setFormData((prev) => ({
              ...prev,
              customer_id: customer.id,
              shop_name: customer.shop_name || "",
              shop_type: customer.shop_type || "",
              shop_address: customer.shop_address || "",
              zipcode: customer.zipcode || "",
              city: customer.city || "",
              county: customer.county || "",
              contact_person: customer.contact_person || "",
              contact_phone: customer.contact_phone || "",
              contact_email: customer.contact_email || "",
              job_title: customer.job_title || "",
              gps_coordinates: customer.gps_coordinates || null,
            }));
          } else {
            setError("Customer not found for the provided ID.");
          }
        }
      } catch (err) {
        setError("Failed to load initial data: " + err.message);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [location.search]);

  // Auto-save functionality - only when we have a visit ID
  useEffect(() => {
    if (visitId && isDraftCreated) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveDraft();
      }, 30000); // Auto-save every 30 seconds
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [visitId, isDraftCreated, formData]);

  // Removed useEffect for fetching suggested contacts based on shop_name
  // Removed fetchSuggestedContacts and handleContactSelect functions

  const loadVisitData = async (id) => {
    try {
      // Use get() method instead of filter() to get a single visit by ID
      const visit = await ShopVisit.get(id);
      if (visit) {
        // Convert visit_date from datetime to date string for the form
        const formDataToSet = {
          ...visit,
          visit_date: visit.visit_date ? new Date(visit.visit_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          // Ensure sales_data is initialized if missing
          sales_data: visit.sales_data || {}
        };
        setFormData(formDataToSet);
        if (visit.customer_id) {
          // Use get() method instead of filter() for single customer lookup
          try {
            const customer = await Customer.get(visit.customer_id);
            if (customer) {
              setSelectedCustomer(customer);
            }
          } catch (err) {
            // Failed to load customer
          }
        }
      } else {
        setError("Visit not found.");
      }
    } catch (err) {
      setError("Failed to load visit data.");
    }
  };

  const sections = [
    { title: "Shop Information", component: ShopInfoSection },
    { title: "Product Visibility", component: ProductVisibilitySection },
    { title: "Training & Support", component: TrainingSection },
    { title: "Commercial Outcomes", component: CommercialSection },
    { title: "Photos & Notes", component: PhotoSection },
    { title: "Signature", component: SignatureSection }
  ];

  const updateFormData = (updates) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  };

  const saveDraft = async () => {
    if (isDraftSaving || !visitId) return;
    
    setIsDraftSaving(true);
    try {
      // Clean visit_photos to ensure all items are strings
      const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
        typeof photo === 'string' && photo.trim().length > 0
      );
      
      // Ensure visit_date is a proper datetime string
      // Include ALL fields from formData to ensure nothing is lost
      const draftData = { 
        ...formData, 
        visit_photos: cleanVisitPhotos,
        is_draft: true,
        visit_date: formData.visit_date ? new Date(formData.visit_date).toISOString() : new Date().toISOString(),
        draft_saved_at: new Date().toISOString(),
        // Ensure sales_data is included
        sales_data: formData.sales_data || {}
      };
      await ShopVisit.update(visitId, draftData);
      setLastSaved(new Date());
    } catch (err) {
      // Failed to save draft
    }
    setIsDraftSaving(false);
  };

  const createInitialDraft = async () => {
    if (isDraftCreated || !formData.customer_id) return null; // Changed condition: Requires customer_id
    
    setIsDraftCreated(true); // Prevent multiple calls
    try {
      // Clean visit_photos to ensure all items are strings
      const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
        typeof photo === 'string' && photo.trim().length > 0
      );
      
      // Ensure visit_date is a proper datetime string
      // Include ALL fields from formData to ensure nothing is lost
      const draftData = { 
        ...formData, 
        visit_photos: cleanVisitPhotos,
        is_draft: true,
        visit_date: formData.visit_date ? new Date(formData.visit_date).toISOString() : new Date().toISOString(),
        draft_saved_at: new Date().toISOString(),
        // Ensure sales_data is included
        sales_data: formData.sales_data || {}
      };
      const created = await ShopVisit.create(draftData);
      setVisitId(created.id);
      setLastSaved(new Date());
      window.history.replaceState(null, '', `${window.location.pathname}?id=${created.id}`);
      return created.id;
    } catch (err) {
      setIsDraftCreated(false); // Reset on error
      setError("Could not create a new visit report draft.");
      return null;
    }
  }

  const handleNextSection = async () => {
    // Create the initial draft when moving from the first section, if a customer is selected
    let currentVisitId = visitId;
    if (currentSection === 0 && !visitId && formData.customer_id) { // Changed condition: Requires customer_id
        currentVisitId = await createInitialDraft();
    }
    
    if (currentSection < sections.length - 1) {
      if(currentVisitId || visitId) {
        setCurrentSection((prev) => prev + 1);
      }
    }
  };

  const calculateScore = (data) => {
    let score = 0;
    score += (data.product_visibility_score || 0) * 0.3;
    if (data.training_provided) score += 20;
    const commercialScores = {
      new_order: 25,
      order_commitment: 20,
      price_negotiation: 15,
      complaint_resolved: 10,
      information_only: 5,
      no_outcome: 0
    };
    score += commercialScores[data.commercial_outcome] || 0;
    score += (data.overall_satisfaction || 0) * 2.5;
    // Round to integer as the schema expects an int, not a float
    return Math.round(Math.min(100, Math.max(0, score)));
  };

  const getPriorityLevel = (score) => {
    if (score >= 80) return "low";
    if (score >= 60) return "medium";
    return "high";
  };

  const validateChecklist = () => {
    const hasPhotos = formData.visit_photos && formData.visit_photos.length > 0;
    // Questionnaire complete check now includes customer_id as required
    const isComplete = formData.customer_id && formData.shop_name && formData.shop_type && formData.visit_purpose;
    const hasFollowUp = formData.follow_up_required ? formData.follow_up_notes && formData.follow_up_notes.length > 0 : true;
    const hasSignature = !!formData.signature && !!formData.signature_signer_name && !!formData.signature_date;

    setChecklistItems({
      photosAttached: hasPhotos,
      questionnaireComplete: isComplete,
      followUpAdded: hasFollowUp,
      signatureAttached: hasSignature
    });

    setShowPreSubmitChecklist(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Added customer_id to required fields
      const requiredFields = ['customer_id', 'shop_name', 'shop_type', 'visit_date', 'visit_purpose'];
      const missingFields = requiredFields.filter((field) => !formData[field]);

      if (missingFields.length > 0) {
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      }

      const calculatedScore = calculateScore(formData);
      const priorityLevel = getPriorityLevel(calculatedScore);

      // Ensure visit_date is a proper datetime string
      // Ensure visit_photos contains only strings (filter out any non-string values)
      const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
        typeof photo === 'string' && photo.trim().length > 0
      );
      
      // Build complete payload with ALL fields from formData
      // This ensures nothing is lost when saving to database
      const payload = {
        ...formData,
        visit_date: formData.visit_date ? new Date(formData.visit_date).toISOString() : new Date().toISOString(),
        calculated_score: calculatedScore,
        priority_level: priorityLevel,
        visit_photos: cleanVisitPhotos, // Ensure all items are strings
        is_draft: false,
        draft_saved_at: null, // Explicitly set to null for final submission
        // Ensure all optional fields are included even if empty
        products_discussed: formData.products_discussed || [],
        training_topics: formData.training_topics || [],
        support_materials_items: formData.support_materials_items || [],
        gps_coordinates: formData.gps_coordinates || null,
        signature: formData.signature || null,
        signature_signer_name: formData.signature_signer_name || null,
        signature_date: formData.signature_date ? new Date(formData.signature_date).toISOString() : null,
        // Ensure sales_data is included (contains all the sales/purchase breakdown data)
        sales_data: formData.sales_data || {}
      };

      let currentVisitId = visitId;
      if (!currentVisitId) {
        const created = await ShopVisit.create(payload);
        currentVisitId = created.id;
      } else {
        await ShopVisit.update(currentVisitId, payload);
      }

      // Removed the Customer.create logic, as customer selection/creation is handled elsewhere.
      // A visit is now always associated with an existing customer_id in formData.

      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }

      setSuccess(true);
      setShowPreSubmitChecklist(false);

      setTimeout(() => {
        navigate(createPageUrl("Dashboard"));
      }, 2000);

    } catch (err) {
      setError(err.message);
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = () => {
    if (formData && user) {
      generateVisitReportPDF(formData, user);
    } else {
      alert("Report data or user data is not loaded yet.");
    }
  };

  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const getRequiredFieldsForSection = (sectionIndex) => {
    const requiredFields = {
      // customer_id is now a required field for the first section
      0: ['customer_id', 'shop_name', 'shop_type', 'visit_purpose'],
      1: [],
      2: [],
      3: [],
      4: [],
      5: []
    };
    return requiredFields[sectionIndex] || [];
  };

  const CurrentSectionComponent = sections[currentSection].component;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Visit Report Saved!</h2>
          <p className="text-gray-600 mb-6">Your shop visit has been successfully recorded.</p>
          <Button
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="bg-green-600 hover:bg-green-700"
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-0 to-green-0" id="page-content">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="border-green-200 hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{visitId ? "Edit Visit Report" : "New Visit Report"}</h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-gray-600">Document your shop visit details</p>
              {formData.is_draft && (
                <Badge variant="outline" className="border-orange-300 text-orange-700">
                  Draft
                </Badge>
              )}
              {lastSaved && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  {isDraftSaving && <span className="text-blue-600">(Saving...)</span>}
                </div>
              )}
            </div>
          </div>
          <Button onClick={handleDownloadPdf} variant="outline" className="border-green-200 hover:bg-green-50">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </motion.div>

        <div>
          <FormProgress
            sections={sections}
            currentSection={currentSection}
            onSectionClick={setCurrentSection}
            requiredFields={getRequiredFieldsForSection(currentSection)}
            formData={formData}
          />

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form Section */}
          <motion.div
            key={currentSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-lg border-green-100 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-xl font-bold text-green-800">
                  {sections[currentSection].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <CurrentSectionComponent
                  formData={formData}
                  updateFormData={updateFormData}
                  selectedCustomer={selectedCustomer} // Pass selectedCustomer to ShopInfoSection
                  // removed suggestedContacts and onContactSelect props
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={previousSection}
            disabled={currentSection === 0}
            className="border-green-200 hover:bg-green-50"
          >
            Previous
          </Button>

          <div className="flex gap-3">
            {currentSection < sections.length - 1 ? (
              <Button
                onClick={handleNextSection}
                className="bg-green-600 hover:bg-green-700"
              >
                Next Section
              </Button>
            ) : (
              <Button
                onClick={validateChecklist}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Saving...' : (visitId ? "Update Visit Report" : "Save Visit Report")}
              </Button>
            )}
          </div>
        </div>

        {/* Pre-Submit Checklist Dialog */}
        <Dialog open={showPreSubmitChecklist} onOpenChange={setShowPreSubmitChecklist}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pre-Submission Checklist</DialogTitle>
              <DialogDescription>
                Please review the checklist before submitting your visit report.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="photos"
                  checked={checklistItems.photosAttached}
                  disabled
                />
                <label htmlFor="photos" className={checklistItems.photosAttached ? "text-green-700" : "text-red-600"}>
                  Are all mandatory photos attached? {checklistItems.photosAttached ? "✓" : "✗"}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="questionnaire"
                  checked={checklistItems.questionnaireComplete}
                  disabled
                />
                <label htmlFor="questionnaire" className={checklistItems.questionnaireComplete ? "text-green-700" : "text-red-600"}>
                  Is the questionnaire fully completed? {checklistItems.questionnaireComplete ? "✓" : "✗"}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="followup"
                  checked={checklistItems.followUpAdded}
                  disabled
                />
                <label htmlFor="followup" className={checklistItems.followUpAdded ? "text-green-700" : "text-red-600"}>
                  Has a follow-up date been added if required? {checklistItems.followUpAdded ? "✓" : "✗"}
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="signature"
                  checked={checklistItems.signatureAttached}
                  disabled
                />
                <label htmlFor="signature" className={checklistItems.signatureAttached ? "text-green-700" : "text-red-600"}>
                  Has the signature been captured? {checklistItems.signatureAttached ? "✓" : "✗"}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowPreSubmitChecklist(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !Object.values(checklistItems).every(Boolean)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    "Confirm & Save"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
