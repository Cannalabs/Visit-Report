import React from 'react';
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";

export default function FormProgress({ sections, currentSection, onSectionClick, disabled = false, formData, getRequiredFieldsForSection, setError }) {
  const handleSectionClick = (targetSection) => {
    // If clicking on current section or going back, allow it
    if (targetSection === currentSection || targetSection < currentSection) {
      onSectionClick(targetSection);
      return;
    }
    
    // If going forward, validate required fields for current section
    if (targetSection > currentSection) {
      const requiredFields = getRequiredFieldsForSection ? getRequiredFieldsForSection(currentSection) : [];
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
        // Special case: follow_up_notes is required only if follow_up_required is true
        if (field === 'follow_up_notes' && formData.follow_up_required && (!value || value.trim() === '')) return true;
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
        if (setError) {
          setError(`Please complete the following required fields in ${sections[currentSection]?.title || 'current section'}: ${missingLabels}`);
        }
        return; // Don't navigate if validation fails
      }
    }
    
    // If validation passes or going back, allow navigation
    onSectionClick(targetSection);
  };

  return (
    <Card className="mb-8 p-4">
      <div className="flex items-center justify-between">
        {sections.map((section, index) => (
          <React.Fragment key={index}>
            <motion.div
              className={`flex items-center gap-2 transition-colors duration-200 ${
                disabled 
                  ? 'cursor-not-allowed opacity-60' 
                  : 'cursor-pointer'
              } ${
                index === currentSection 
                  ? 'text-green-600' 
                  : index < currentSection 
                    ? 'text-green-500' 
                    : 'text-gray-400'
              }`}
              onClick={disabled ? undefined : () => handleSectionClick(index)}
              whileHover={disabled ? {} : { scale: 1.05 }}
            >
              {index < currentSection ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Circle className={`w-6 h-6 ${index === currentSection ? 'fill-current' : ''}`} />
              )}
              <span className="font-medium text-sm hidden md:inline">
                {section.title}
              </span>
            </motion.div>
            
            {index < sections.length - 1 && (
              <div className={`flex-1 h-px mx-4 ${
                index < currentSection ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}