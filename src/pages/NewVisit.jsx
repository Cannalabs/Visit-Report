
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

  const autoCreateDraftTimeoutRef = useRef(null);
  const isCreatingDraftRef = useRef(false);
  const autoSaveTimeoutRef = useRef(null);
  const isAutoSavingRef = useRef(false);
  const previousFormDataRef = useRef(null);

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
    opening_time: "",
    closing_time: "",
    visit_status: "draft", // appointment, draft, done
    assigned_user_id: null,
    planned_visit_date: null,
    appointment_description: "",
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
    follow_up_date: null,
    follow_up_assigned_user_id: null,
    follow_up_stage: null,
    notes: "",
    visit_photos: [],
    gps_coordinates: null,
    signature: null,
    signature_signer_name: null,
    signature_date: null,
    sales_data: {}, // Sales and purchase breakdown data
    is_draft: false // Keep for backward compatibility
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
    const sectionParam = params.get('section'); // Get section parameter to jump to specific section

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
              opening_time: customer.opening_time || "",
              closing_time: customer.closing_time || "",
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

  // Handle section navigation after visit data is loaded
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sectionParam = params.get('section');
    const highlightParam = params.get('highlight');
    
    if (sectionParam && visitId && !isLoading) {
      const sectionIndex = parseInt(sectionParam, 10);
      // Sections array has 6 items (0-5), so check if index is valid
      if (!isNaN(sectionIndex) && sectionIndex >= 0 && sectionIndex < 6) {
        setCurrentSection(sectionIndex);
        
        // If highlight parameter is set, scroll to the follow-up section after a short delay
        if (highlightParam === 'followup' && sectionIndex === 3) {
          setTimeout(() => {
            const followUpCard = document.getElementById('follow-up-section');
            if (followUpCard) {
              followUpCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Add a highlight effect
              followUpCard.classList.add('ring-4', 'ring-orange-300', 'ring-opacity-75');
              setTimeout(() => {
                followUpCard.classList.remove('ring-4', 'ring-orange-300', 'ring-opacity-75');
              }, 3000);
            }
          }, 500);
        }
      }
    }
  }, [visitId, isLoading, location.search]);

  // Auto-create draft when Step 1 mandatory fields are completed
  useEffect(() => {
    // Clear any pending timeout
    if (autoCreateDraftTimeoutRef.current) {
      clearTimeout(autoCreateDraftTimeoutRef.current);
      autoCreateDraftTimeoutRef.current = null;
    }
    
    // Skip if already creating a draft
    if (isCreatingDraftRef.current) {
      return;
    }
    
    // Create visit ID immediately when customer is selected (for both appointments and drafts)
    if (formData.customer_id && !visitId && !isDraftCreated) {
      // Use a small delay to debounce and avoid creating multiple drafts
      autoCreateDraftTimeoutRef.current = setTimeout(async () => {
        // Double-check conditions (they might have changed during timeout)
        if (formData.customer_id && !visitId && !isDraftCreated && !isCreatingDraftRef.current) {
          isCreatingDraftRef.current = true;
          try {
            const newVisitId = await createInitialDraft();
            if (newVisitId) {
              console.log("Auto-created visit with ID:", newVisitId);
            }
          } catch (err) {
            console.error("Auto-create visit failed:", err);
            isCreatingDraftRef.current = false; // Reset on error
          } finally {
            isCreatingDraftRef.current = false;
          }
        }
        autoCreateDraftTimeoutRef.current = null;
      }, 500); // Small delay to debounce (500ms)
    }
    
    return () => {
      if (autoCreateDraftTimeoutRef.current) {
        clearTimeout(autoCreateDraftTimeoutRef.current);
        autoCreateDraftTimeoutRef.current = null;
      }
    };
  }, [formData.customer_id, visitId, isDraftCreated]);

  // Initialize previousFormDataRef after visit data is loaded
  useEffect(() => {
    if (visitId && !isLoading && previousFormDataRef.current === null) {
      // Deep clone formData to avoid reference issues
      previousFormDataRef.current = JSON.parse(JSON.stringify(formData));
    }
  }, [visitId, isLoading]);

  // Auto-save on any formData change (debounced)
  useEffect(() => {
    // Skip auto-save if:
    // 1. No visitId yet (draft not created)
    // 2. Visit is already "done" (submitted)
    // 3. Currently auto-saving
    // 4. Currently creating draft
    // 5. Initial load (previousFormDataRef is null - not initialized yet)
    if (
      !visitId || 
      formData.visit_status === "done" || 
      (!formData.visit_status && formData.is_draft === false) ||
      isAutoSavingRef.current ||
      isCreatingDraftRef.current ||
      previousFormDataRef.current === null ||
      isLoading
    ) {
      return;
    }

    // Check if formData actually changed (deep comparison)
    const currentDataStr = JSON.stringify(formData);
    const previousDataStr = JSON.stringify(previousFormDataRef.current);
    
    if (currentDataStr === previousDataStr) {
      // No changes, skip auto-save
      return;
    }

    // Clear any pending auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    // Debounce auto-save: wait 1.5 seconds after last change
    autoSaveTimeoutRef.current = setTimeout(async () => {
      // Double-check conditions (they might have changed during timeout)
      if (
        !visitId || 
        formData.visit_status === "done" || 
        (!formData.visit_status && formData.is_draft === false) ||
        isAutoSavingRef.current ||
        isCreatingDraftRef.current ||
        isLoading
      ) {
        autoSaveTimeoutRef.current = null;
        return;
      }

      // Check again if formData changed (might have changed again during timeout)
      const currentDataStrCheck = JSON.stringify(formData);
      const previousDataStrCheck = JSON.stringify(previousFormDataRef.current);
      
      if (currentDataStrCheck === previousDataStrCheck) {
        // No changes, skip save
        autoSaveTimeoutRef.current = null;
        return;
      }

      isAutoSavingRef.current = true;
      setIsDraftSaving(true);
      try {
        // Clean visit_photos to ensure all items are strings
        const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
          typeof photo === 'string' && photo.trim().length > 0
        );
        
        // For appointments, ensure is_draft is false
        const isAppointment = formData.visit_status === "appointment";
        
        const draftData = { 
          ...formData, 
          visit_photos: cleanVisitPhotos,
          is_draft: !isAppointment,
          // Ensure visit_date includes time (hours, minutes, seconds) for heat map analysis
          visit_date: formData.visit_date 
            ? (formData.visit_date.includes('T') 
                ? new Date(formData.visit_date).toISOString() 
                : new Date(formData.visit_date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
            : new Date().toISOString(),
          planned_visit_date: formData.planned_visit_date ? new Date(formData.planned_visit_date).toISOString() : null,
          draft_saved_at: new Date().toISOString(),
          // Ensure sales_data is included
          sales_data: formData.sales_data || {}
        };
        
        await ShopVisit.update(visitId, draftData);
        setLastSaved(new Date());
        // Update previousFormDataRef after successful save (deep clone)
        previousFormDataRef.current = JSON.parse(JSON.stringify(formData));
      } catch (err) {
        console.error("Auto-save failed:", err);
        // Don't show error to user for auto-save failures, just log it
      } finally {
        setIsDraftSaving(false);
        isAutoSavingRef.current = false;
      }
      
      autoSaveTimeoutRef.current = null;
    }, 1500); // 1.5 second debounce delay

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, [formData, visitId, isLoading]);

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
        // Initialize previousFormDataRef after loading visit data
        previousFormDataRef.current = JSON.parse(JSON.stringify(formDataToSet));
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
    setFormData((prev) => {
      // If user is explicitly setting visit_status, always allow it (don't override)
      if (updates.hasOwnProperty('visit_status')) {
        const newStatus = updates.visit_status;
        const updatedData = { ...prev, ...updates };
        
        // If setting to "appointment", save it immediately with all current data
        if (newStatus === "appointment") {
          // Save appointment status asynchronously
          const saveAppointment = async () => {
            try {
              if (visitId) {
                // Update existing visit with all current formData to ensure nothing is lost
                const cleanVisitPhotos = (updatedData.visit_photos || []).filter(photo => 
                  typeof photo === 'string' && photo.trim().length > 0
                );
                
                const updateData = {
                  ...updatedData,
                  visit_photos: cleanVisitPhotos,
                  visit_status: "appointment",
                  is_draft: false,
                  visit_date: updatedData.visit_date ? new Date(updatedData.visit_date).toISOString() : new Date().toISOString(),
                  planned_visit_date: updatedData.planned_visit_date ? new Date(updatedData.planned_visit_date).toISOString() : null,
                  sales_data: updatedData.sales_data || {}
                };
                
                await ShopVisit.update(visitId, updateData);
              } else if (prev.customer_id && prev.visit_date && prev.visit_purpose) {
                // Create new appointment visit if required fields are filled
                const cleanVisitPhotos = (updatedData.visit_photos || []).filter(photo => 
                  typeof photo === 'string' && photo.trim().length > 0
                );
                
                const appointmentData = {
                  ...updatedData,
                  visit_photos: cleanVisitPhotos,
                  visit_status: "appointment",
                  is_draft: false,
                  visit_date: updatedData.visit_date ? new Date(updatedData.visit_date).toISOString() : new Date().toISOString(),
                  planned_visit_date: updatedData.planned_visit_date ? new Date(updatedData.planned_visit_date).toISOString() : null,
                  sales_data: updatedData.sales_data || {}
                };
                const created = await ShopVisit.create(appointmentData);
                if (created && created.id) {
                  setVisitId(created.id);
                  setIsDraftCreated(true);
                  // Update URL with the new ID
                  window.history.replaceState(null, '', `${window.location.pathname}?id=${created.id}`);
                }
              }
            } catch (err) {
              console.error("Failed to save appointment status:", err);
            }
          };
          saveAppointment();
        }
        
        return updatedData;
      }
      
      // If current status is "appointment" and user is filling visit data (not just appointment fields),
      // automatically change status to "draft" ONLY when moving to next section
      // First page fields (visit_date, visit_purpose, visit_duration) should NOT trigger status change
      let newStatus = prev.visit_status;
      if (prev.visit_status === "appointment") {
        // List of fields that can be updated without changing appointment to draft
        // This includes appointment fields AND first page basic fields
        const appointmentSafeFields = [
          'assigned_user_id', 
          'planned_visit_date', 
          'appointment_description',
          'visit_notes', // Customer visit notes
          'visit_date', // First page - can be updated for appointment planning
          'visit_duration', // First page - can be updated for appointment planning
          'visit_purpose', // First page - can be updated for appointment planning
          'customer_id', // Shop selection - can be changed for appointment
          'shop_name', 'shop_type', 'shop_address', // Shop info - can be updated
          'contact_person', 'contact_phone', 'contact_email', 'job_title', // Contact info - can be updated
          'zipcode', 'city', 'county', 'region' // Additional shop info fields
        ];
        
        // Fields that indicate visit documentation has started (beyond first page)
        // These WILL trigger status change from appointment to draft
        const visitDataFields = [
          'product_visibility_score', 'products_discussed', 'competitor_presence',
          'training_provided', 'training_topics', 'support_materials_required',
          'commercial_outcome', 'order_value', 'overall_satisfaction',
          'follow_up_required', 'follow_up_notes', 'follow_up_date', 'follow_up_assigned_user_id', 'follow_up_stage', 'notes',
          'visit_photos', 'signature', 'signature_signer_name',
          'sales_data'
        ];
        
        // Check if ALL updated fields are appointment-safe fields
        const updatedKeys = Object.keys(updates);
        
        // If no fields are being updated, keep current status
        if (updatedKeys.length === 0) {
          newStatus = prev.visit_status;
        } else {
          // Check if ALL updated fields are appointment-safe fields
          const allFieldsAreSafe = updatedKeys.every(key => appointmentSafeFields.includes(key));
          
          // If all updated fields are safe, explicitly keep status as "appointment"
          if (allFieldsAreSafe) {
            newStatus = "appointment";
          } else {
            // Check if any of the updated fields are visit data fields (beyond first page)
            const isFillingVisitData = updatedKeys.some(key => {
              // Skip appointment-safe fields (appointment fields + first page fields)
              if (appointmentSafeFields.includes(key)) return false;
              
              // If it's a known visit data field (beyond first page), check if it has a meaningful value
              if (visitDataFields.includes(key)) {
                const value = updates[key];
                // Check if value is meaningful (not null, undefined, empty string, empty array, empty object)
                if (value === null || value === undefined || value === "") return false;
                if (Array.isArray(value) && value.length === 0) return false;
                if (typeof value === 'object' && Object.keys(value || {}).length === 0) return false;
                return true;
              }
              
              // For any other field (not in appointment-safe list), don't trigger change
              // Only known visit data fields should trigger status change
              return false;
            });
            
            if (isFillingVisitData) {
              newStatus = "draft";
            } else {
              // If no visit data fields are being filled, keep status as "appointment"
              newStatus = "appointment";
            }
          }
        }
      }
      
      // If status is "appointment", automatically sync visit_date with planned_visit_date
      if (newStatus === "appointment" && updates.planned_visit_date) {
        // Convert planned_visit_date to date string format (YYYY-MM-DD)
        const plannedDate = new Date(updates.planned_visit_date);
        const dateString = plannedDate.toISOString().split('T')[0];
        updates.visit_date = dateString;
      } else if (newStatus === "appointment" && prev.planned_visit_date && !updates.visit_date) {
        // If status is already "appointment" and planned_visit_date exists, sync visit_date
        const plannedDate = new Date(prev.planned_visit_date);
        const dateString = plannedDate.toISOString().split('T')[0];
        updates.visit_date = dateString;
      }
      
      // If status is changing from "appointment" to "draft", automatically set visit_date to planned_visit_date if not already set
      if (prev.visit_status === "appointment" && newStatus === "draft" && !updates.visit_date) {
        // Use planned_visit_date as visit_date if available
        if (prev.planned_visit_date) {
          // Convert planned_visit_date to date string format (YYYY-MM-DD)
          const plannedDate = new Date(prev.planned_visit_date);
          const dateString = plannedDate.toISOString().split('T')[0];
          updates.visit_date = dateString;
        }
      }
      
      const finalData = { 
        ...prev, 
        ...updates,
        visit_status: newStatus
      };
      
      // If status changed from "appointment" to "draft", save it immediately
      if (prev.visit_status === "appointment" && newStatus === "draft" && visitId) {
        const saveStatusChange = async () => {
          try {
            const cleanVisitPhotos = (finalData.visit_photos || []).filter(photo => 
              typeof photo === 'string' && photo.trim().length > 0
            );
            
            // Use planned_visit_date as visit_date if visit_date is not set
            let visitDateToUse = finalData.visit_date;
            if (!visitDateToUse && finalData.planned_visit_date) {
              visitDateToUse = new Date(finalData.planned_visit_date).toISOString().split('T')[0];
            }
            
            const updateData = {
              ...finalData,
              visit_photos: cleanVisitPhotos,
              visit_status: "draft",
              is_draft: true,
              visit_date: visitDateToUse ? new Date(visitDateToUse).toISOString() : new Date().toISOString(),
              planned_visit_date: finalData.planned_visit_date ? new Date(finalData.planned_visit_date).toISOString() : null,
              sales_data: finalData.sales_data || {}
            };
            
            await ShopVisit.update(visitId, updateData);
          } catch (err) {
            console.error("Failed to save status change to draft:", err);
          }
        };
        saveStatusChange();
      }
      
      
      return finalData;
    });
    setError(null);
  };

  const saveDraft = async () => {
    // Don't save if report is already submitted or status is "done"
    // Allow saving for appointments and drafts
    if (isDraftSaving || !visitId || formData.visit_status === "done" || (!formData.visit_status && formData.is_draft === false)) {
      return;
    }
    
    // Cancel any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    // For appointments, ensure is_draft is false
    const isAppointment = formData.visit_status === "appointment";
    
    setIsDraftSaving(true);
    isAutoSavingRef.current = true; // Prevent auto-save during manual save
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
        is_draft: !isAppointment, // Set is_draft to false for appointments
        // Ensure visit_date includes time (hours, minutes, seconds) for heat map analysis
        visit_date: formData.visit_date 
          ? (formData.visit_date.includes('T') 
              ? new Date(formData.visit_date).toISOString() 
              : new Date(formData.visit_date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
          : new Date().toISOString(),
        planned_visit_date: formData.planned_visit_date ? new Date(formData.planned_visit_date).toISOString() : null,
        draft_saved_at: new Date().toISOString(),
        // Ensure sales_data is included
        sales_data: formData.sales_data || {}
      };
      await ShopVisit.update(visitId, draftData);
      setLastSaved(new Date());
      // Update previousFormDataRef after successful manual save
      previousFormDataRef.current = JSON.parse(JSON.stringify(formData));
    } catch (err) {
      // Failed to save draft
      console.error("Manual save failed:", err);
    } finally {
      setIsDraftSaving(false);
      isAutoSavingRef.current = false;
    }
  };

  const createInitialDraft = async () => {
    if (isDraftCreated || visitId) {
      // If draft already created, return existing visitId
      return visitId;
    }
    
    // Validate required fields before creating draft
    if (!formData.customer_id) {
      setError("Customer selection is required to create a visit draft");
      isCreatingDraftRef.current = false;
      return null;
    }
    
    setIsDraftCreated(true); // Prevent multiple calls
    isCreatingDraftRef.current = true;
    try {
      // Clean visit_photos to ensure all items are strings
      const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
        typeof photo === 'string' && photo.trim().length > 0
      );
      
      // Ensure visit_date is a proper datetime string
      // Include ALL fields from formData to ensure nothing is lost
      // Preserve the visit_status (appointment or draft)
      // Ensure visit_date includes time (hours, minutes, seconds) for heat map analysis
      const visitDateWithTime = formData.visit_date 
        ? (formData.visit_date.includes('T') 
            ? new Date(formData.visit_date).toISOString() 
            : new Date(formData.visit_date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
        : new Date().toISOString();
      
      const draftData = { 
        ...formData, 
        visit_photos: cleanVisitPhotos,
        is_draft: formData.visit_status !== "appointment", // Only set is_draft if not appointment
        visit_status: formData.visit_status || "draft", // Preserve visit_status
        visit_date: visitDateWithTime,
        planned_visit_date: formData.planned_visit_date ? new Date(formData.planned_visit_date).toISOString() : null,
        draft_saved_at: new Date().toISOString(),
        // Ensure sales_data is included
        sales_data: formData.sales_data || {}
      };
      
      const created = await ShopVisit.create(draftData);
      
      // Ensure we got an ID back
      if (!created || !created.id) {
        console.error("Draft creation response:", created);
        throw new Error("Draft created but no ID returned from server");
      }
      
      // Set the visitId state immediately
      const newVisitId = created.id;
      setVisitId(newVisitId);
      
      // Update formData to preserve status
      setFormData(prev => ({ 
        ...prev, 
        is_draft: prev.visit_status !== "appointment",
        visit_status: prev.visit_status || "draft"
      }));
      
      setLastSaved(new Date());
      
      // Update URL with the new ID
      window.history.replaceState(null, '', `${window.location.pathname}?id=${newVisitId}`);
      
      // Log for debugging
      console.log("Draft created with ID:", newVisitId);
      
      
      isCreatingDraftRef.current = false;
      return newVisitId;
    } catch (err) {
      setIsDraftCreated(false); // Reset on error so user can retry
      isCreatingDraftRef.current = false; // Reset ref on error
      const errorMessage = err.response?.data?.detail || err.message || "Could not create a new visit report draft";
      setError(errorMessage);
      return null;
    }
  }

  const handleNextSection = async () => {
      // Handle status change from "appointment" to "draft" when moving from first section
      if (currentSection === 0 && formData.visit_status === "appointment") {
        // Determine visit_date: use planned_visit_date if visit_date is not set
        let visitDateToUse = formData.visit_date;
        if (!visitDateToUse && formData.planned_visit_date) {
          visitDateToUse = new Date(formData.planned_visit_date).toISOString().split('T')[0];
        }
        
        // Update the status and visit_date immediately in formData
        setFormData(prev => ({ 
          ...prev, 
          visit_status: "draft",
          visit_date: visitDateToUse || prev.visit_date
        }));
        
        // If visit already exists, save the status change to backend with all current data
        if (visitId) {
          try {
            const cleanVisitPhotos = (formData.visit_photos || []).filter(photo => 
              typeof photo === 'string' && photo.trim().length > 0
            );
            
            const updateData = {
              ...formData,
              visit_photos: cleanVisitPhotos,
              visit_status: "draft",
              is_draft: true,
              visit_date: visitDateToUse ? new Date(visitDateToUse).toISOString() : (formData.visit_date ? new Date(formData.visit_date).toISOString() : new Date().toISOString()),
              planned_visit_date: formData.planned_visit_date ? new Date(formData.planned_visit_date).toISOString() : null,
              sales_data: formData.sales_data || {}
            };
            
            await ShopVisit.update(visitId, updateData);
          } catch (err) {
            console.error("Failed to update visit status:", err);
          }
        }
      }
    
    // Create the initial draft when moving from the first section
    let currentVisitId = visitId;
    if (currentSection === 0 && !visitId) {
      // Save original status before updating
      const wasAppointment = formData.visit_status === "appointment";
      
      // Determine visit_date: use planned_visit_date if visit_date is not set
      let visitDateToUse = formData.visit_date;
      if (!visitDateToUse && formData.planned_visit_date) {
        visitDateToUse = new Date(formData.planned_visit_date).toISOString().split('T')[0];
      }
      
      // Update formData status to "draft" and visit_date if it was "appointment"
      if (wasAppointment) {
        setFormData(prev => ({ 
          ...prev, 
          visit_status: "draft",
          visit_date: visitDateToUse || prev.visit_date
        }));
      }
      
        currentVisitId = await createInitialDraft();
      if (!currentVisitId) {
        // Draft creation failed, don't proceed
        return;
      }
      
      // After draft creation, ensure status is saved as "draft" with correct visit_date
      if (wasAppointment) {
        try {
          const updateData = {
            visit_status: "draft",
            is_draft: true
          };
          // Include visit_date if it was set from planned_visit_date
          if (visitDateToUse) {
            updateData.visit_date = new Date(visitDateToUse).toISOString();
          }
          await ShopVisit.update(currentVisitId, updateData);
          // Update local formData to reflect the change
          setFormData(prev => ({ 
            ...prev, 
            visit_status: "draft",
            visit_date: visitDateToUse || prev.visit_date
          }));
        } catch (err) {
          console.error("Failed to update visit status:", err);
        }
      }
    }
    
    // Validate required fields for current section before proceeding
    const requiredFields = getRequiredFieldsForSection(currentSection);
    const missingFields = requiredFields.filter((field) => {
      const value = formData[field];
      // Check if field is empty
      if (value === null || value === undefined || value === "") return true;
      // Check if array is empty
      if (Array.isArray(value) && value.length === 0) return true;
      // For numeric fields like overall_satisfaction, check if it's 0 or invalid
      if (field === 'overall_satisfaction' && (value === 0 || value === null || value === undefined)) return true;
      // For product_visibility_score, 0 is valid, only check for null/undefined
      if (field === 'product_visibility_score' && (value === null || value === undefined)) return true;
      return false;
    });

    if (missingFields.length > 0) {
      const fieldLabels = {
        'customer_id': 'Customer/Shop',
        'shop_name': 'Shop Name',
        'shop_type': 'Shop Type',
        'visit_date': 'Visit Date',
        'visit_purpose': 'Visit Purpose',
        'visit_duration': 'Visit Duration',
        'product_visibility_score': 'Overall Product Visibility Score',
        'competitor_presence': 'Competitor Presence',
        'commercial_outcome': 'Commercial Result',
        'overall_satisfaction': 'Overall Satisfaction Rating',
        'follow_up_notes': 'Follow-up Notes',
        'visit_photos': 'Visit Photos',
        'signature': 'Signature',
        'signature_signer_name': 'Signer Name'
      };
      const missingLabels = missingFields.map(field => fieldLabels[field] || field).join(', ');
      setError(`Please complete the following required fields: ${missingLabels}`);
      return;
    }

    // Validate that visit_date is not in the future for non-appointment visits
    if (currentSection === 0 && formData.visit_status !== "appointment" && formData.visit_date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const visitDate = new Date(formData.visit_date);
      visitDate.setHours(0, 0, 0, 0);
      
      if (visitDate > today) {
        setError("Visit date cannot be in the future. Please use 'Planned Visit' status for future visits, or select today's date or a past date.");
        return;
      }
    }
    
    if (currentSection < sections.length - 1) {
      // Only proceed if we have a visitId (either existing or newly created)
      if (currentVisitId || visitId) {
        setCurrentSection((prev) => prev + 1);
        setError(null); // Clear any previous errors
      } else {
        setError("Could not create visit draft. Please try again.");
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

      // Validate that visit_date is not in the future for non-appointment visits
      if (formData.visit_status !== "appointment" && formData.visit_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const visitDate = new Date(formData.visit_date);
        visitDate.setHours(0, 0, 0, 0);
        
        if (visitDate > today) {
          throw new Error("Visit date cannot be in the future. Please use 'Planned Visit' status for future visits, or select today's date or a past date.");
        }
      }

      // Validate signature if signature is provided
      if (formData.signature && !formData.signature_signer_name) {
        throw new Error("Signer name is mandatory when a signature is provided. Please enter the signer name in the Signature section.");
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
      // Ensure visit_date includes time (hours, minutes, seconds) for heat map analysis
      const visitDateWithTime = formData.visit_date 
        ? (formData.visit_date.includes('T') 
            ? new Date(formData.visit_date).toISOString() 
            : new Date(formData.visit_date + 'T' + new Date().toTimeString().split(' ')[0]).toISOString())
        : new Date().toISOString();
      
      const payload = {
        ...formData,
        visit_date: visitDateWithTime,
        calculated_score: calculatedScore,
        priority_level: priorityLevel,
        visit_photos: cleanVisitPhotos, // Ensure all items are strings
        visit_status: "done", // Set status to "done" when submitting
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
      // Section 0: Shop Information - required fields
      // Note: visit_date is only required when status is NOT "appointment" (i.e., when visit has actually happened)
      0: ['customer_id', 'shop_name', 'shop_type', 'visit_purpose', 'visit_duration'],
      // Section 1: Product Visibility - product_visibility_score and competitor_presence are required
      1: ['product_visibility_score', 'competitor_presence'],
      // Section 2: Training & Support - no required fields
      2: [],
      // Section 3: Commercial Outcomes - commercial_outcome and overall_satisfaction are required
      3: ['commercial_outcome', 'overall_satisfaction'],
      // Section 4: Photos & Notes - photos are optional
      4: [],
      // Section 5: Signature - signature and signer name required
      5: ['signature', 'signature_signer_name']
    };
    
    const fields = requiredFields[sectionIndex] || [];
    
    // Special case for Section 0: visit_date is required only if status is NOT "appointment"
    // (When status is "appointment", the visit hasn't happened yet, so visit_date doesn't make sense)
    if (sectionIndex === 0 && formData.visit_status !== "appointment") {
      fields.push('visit_date');
    }
    
    // Special case for Section 3: if follow_up_required is true, follow_up_notes is required
    if (sectionIndex === 3 && formData.follow_up_required && !formData.follow_up_notes) {
      return [...fields, 'follow_up_notes'];
    }
    
    return fields;
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Visit Report Submitted!</h2>
          <p className="text-gray-600 mb-6">Your shop visit report has been successfully submitted and is now locked for editing.</p>
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
      <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4 md:mb-8"
        >
          <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl("Dashboard"))}
              className="border-green-200 hover:bg-green-50 flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">{visitId ? "Edit Visit Report" : "New Visit Report"}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:gap-4 mt-1">
                <p className="text-sm md:text-base text-gray-600">Document your shop visit details</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {formData.visit_status && (
                    <Badge 
                      variant="outline" 
                      className={
                        formData.visit_status === "done" 
                          ? "border-green-300 text-green-700 bg-green-50 text-xs"
                          : formData.visit_status === "appointment"
                          ? "border-blue-300 text-blue-700 bg-blue-50 text-xs"
                          : "border-orange-300 text-orange-700 bg-orange-50 text-xs"
                      }
                    >
                      {formData.visit_status === "done" && <CheckCircle className="w-3 h-3 mr-1" />}
                      {formData.visit_status === "appointment" && "Appointment"}
                      {formData.visit_status === "draft" && "Draft"}
                      {formData.visit_status === "done" && "Done"}
                    </Badge>
                  )}
                  {/* Backward compatibility: show old is_draft badges if visit_status is not set */}
                  {!formData.visit_status && formData.is_draft === false && visitId && (
                    <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Submitted
                    </Badge>
                  )}
                  {!formData.visit_status && formData.is_draft === true && (
                    <Badge variant="outline" className="border-orange-300 text-orange-700 text-xs">
                      Draft
                    </Badge>
                  )}
                  {lastSaved && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="hidden sm:inline">Last saved: </span>
                      <span>{lastSaved.toLocaleTimeString()}</span>
                      {isDraftSaving && <span className="text-blue-600 ml-1">(Auto-saving...)</span>}
                    </div>
                  )}
                  {!lastSaved && visitId && formData.visit_status !== "done" && (!formData.visit_status || formData.is_draft !== false || formData.visit_status === "appointment") && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="hidden sm:inline">Auto-save enabled</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {visitId && formData.visit_status !== "done" && (!formData.visit_status || formData.is_draft !== false || formData.visit_status === "appointment") && (
              <Button 
                onClick={saveDraft} 
                variant="outline" 
                size="sm"
                className="border-green-200 hover:bg-green-50 text-xs sm:text-sm"
                disabled={isDraftSaving}
              >
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isDraftSaving ? "Saving..." : "Save"}</span>
              </Button>
            )}
            <Button 
              onClick={handleDownloadPdf} 
              variant="outline" 
              size="sm"
              className="border-green-200 hover:bg-green-50 text-xs sm:text-sm"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Download PDF</span>
            </Button>
          </div>
        </motion.div>

        <div>
          <FormProgress
            sections={sections}
            currentSection={currentSection}
            onSectionClick={setCurrentSection}
            formData={formData}
            getRequiredFieldsForSection={getRequiredFieldsForSection}
            setError={setError}
            disabled={false}
          />

          {/* Mandatory Fields Summary */}
          {(() => {
            const missingFields = [];
            // Section 0: Shop Info
            if (!formData.customer_id || !formData.shop_name || !formData.shop_type || !formData.visit_purpose) {
              missingFields.push('Shop Information');
            }
            // Section 4: Photos - optional, no longer required
            // if (!formData.visit_photos || formData.visit_photos.length === 0) {
            //   missingFields.push('Visit Photos');
            // }
            // Section 5: Signature
            if (!formData.signature || !formData.signature_signer_name) {
              missingFields.push('E-Signature');
            }
            // Follow-up notes (if required)
            if (formData.follow_up_required && !formData.follow_up_notes) {
              missingFields.push('Follow-up Notes');
            }
            
            // Removed mandatory fields alert as requested
            return null;
          })()}

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
              <CardHeader className="border-b border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-4 md:px-6 py-3 md:py-4">
                <CardTitle className="text-lg md:text-xl font-bold text-green-800">
                  {sections[currentSection].title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {(formData.visit_status === "done" || (!formData.visit_status && formData.is_draft === false && visitId)) ? (
                  <div className="space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800">
                        This visit report has been submitted and is locked for editing. You can view the details below.
                      </AlertDescription>
                    </Alert>
                    <div className="opacity-75 pointer-events-none">
                      <CurrentSectionComponent
                        formData={formData}
                        updateFormData={() => {}} // Disable updates
                        selectedCustomer={selectedCustomer}
                      />
                    </div>
                  </div>
                ) : (
                <CurrentSectionComponent
                  formData={formData}
                  updateFormData={updateFormData}
                  selectedCustomer={selectedCustomer} // Pass selectedCustomer to ShopInfoSection
                  currentUser={user} // Pass current user for permission checks
                  // removed suggestedContacts and onContactSelect props
                />
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 md:mt-8">
          <Button
            variant="outline"
            onClick={previousSection}
            disabled={currentSection === 0}
            className="border-green-200 hover:bg-green-50 w-full sm:w-auto text-sm md:text-base"
          >
            Previous
          </Button>

          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            {!formData.visit_status && formData.is_draft === false && visitId ? (
              <>
            {currentSection < sections.length - 1 ? (
                  <Button
                    onClick={() => {
                      setCurrentSection(currentSection + 1);
                    }}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm md:text-base"
                  >
                    Next Section
                  </Button>
                ) : (
                  <Alert className="flex-1 bg-yellow-50 border-yellow-200">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800 text-sm">
                      This report has been submitted and cannot be edited.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : currentSection < sections.length - 1 ? (
              <Button
                onClick={handleNextSection}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm md:text-base"
              >
                Next Section
              </Button>
            ) : (
              <Button
                onClick={validateChecklist}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm md:text-base"
              >
                <Save className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">{isSubmitting ? 'Submitting...' : (formData.visit_status === "done" || (!formData.visit_status && formData.is_draft === false) ? "Visit Report Submitted" : "Submit Visit Report")}</span>
                <span className="sm:hidden">{isSubmitting ? 'Submitting...' : 'Submit'}</span>
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
                  disabled={isSubmitting || !checklistItems.questionnaireComplete || !checklistItems.followUpAdded || !checklistItems.signatureAttached || (formData.visit_status === "done" || (!formData.visit_status && formData.is_draft === false && visitId))}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
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
