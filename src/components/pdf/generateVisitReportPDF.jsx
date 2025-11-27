export const generateVisitReportPDF = async (formData, user) => {
  // Fetch company logo from configurations
  let companyLogo = null;
  let companyName = 'CANNA';
  let salesRepSignature = null;
  let salesRepName = null;
  
  try {
    const { Configuration, UserProfile } = await import('@/api/entities');
    const configs = await Configuration.list().catch(() => []);
    const companyConfigs = configs.filter(c => c.config_type === "company_settings");
    
    const logoConfig = companyConfigs.find(c => c.config_value === "company_logo");
    const nameConfig = companyConfigs.find(c => c.config_value === "company_name");
    
    if (logoConfig && logoConfig.config_name) {
      companyLogo = logoConfig.config_name;
    }
    
    if (nameConfig && nameConfig.config_name) {
      companyName = nameConfig.config_name;
    }
    
    // Get sales representative (visitor) signature from user profile
    if (user && user.id) {
      try {
        const profile = await UserProfile.getSignature(user.id);
        if (profile && profile.signature) {
          salesRepSignature = profile.signature;
          salesRepName = profile.signature_signer_name || user.full_name;
        } else {
          salesRepName = user.full_name;
        }
      } catch (err) {
        // No saved signature - use name only
        salesRepName = user.full_name;
      }
    }
  } catch (error) {
    // Keep defaults if loading fails
    if (user) {
      salesRepName = user.full_name;
    }
  }

  // Prepare visit data for the HTML template
  const visitData = {
    id: formData.id || 'N/A',
    visitor_name: user?.full_name || 'N/A',
    created_by_name: user?.full_name || 'N/A',
    visit_date: formData.visit_date || new Date().toISOString(),
    shop_type: formData.shop_type || '',
    department: formData.region || '',
    contact_person: formData.contact_person || '',
    shop_name: formData.shop_name || '',
    shop_address: formData.shop_address || '',
    city: formData.city || '',
    country: formData.country || '',
    contact_phone: formData.contact_phone || '',
    contact_email: formData.contact_email || '',
    job_title: formData.job_title || '',
    visit_duration: formData.visit_duration || 60,
    visit_purpose: formData.visit_purpose || '',
    scope: 'Review of shop performance, product visibility, and commercial opportunities.',
    follow_up_required: formData.follow_up_required || false,
    follow_up_notes: formData.follow_up_notes || '',
    follow_up_date: formData.follow_up_date || null,
    follow_up_stage: formData.follow_up_stage || null,
    follow_up_assigned_user_id: formData.follow_up_assigned_user_id || null,
    follow_up_assigned_user_name: formData.follow_up_assigned_user_name || null,
    notes: formData.notes || '',
    product_visibility_score: formData.product_visibility_score || 0,
    competitor_presence: formData.competitor_presence || '',
    overall_satisfaction: formData.overall_satisfaction || 0,
    calculated_score: formData.calculated_score || 0,
    priority_level: formData.priority_level || '',
    commercial_outcome: formData.commercial_outcome || '',
    products_discussed: formData.products_discussed || [],
    training_provided: formData.training_provided || false,
    training_topics: formData.training_topics || [],
    support_materials_required: formData.support_materials_required || false,
    support_materials_items: formData.support_materials_items || [],
    support_materials_other_text: formData.support_materials_other_text || '',
    order_value: formData.order_value || 0,
    sales_data: formData.sales_data || {},
    region: formData.region || '',
    company_logo: companyLogo,
    company_name: companyName,
    signature: formData.signature || null,
    signature_signer_name: formData.signature_signer_name || null,
    signature_date: formData.signature_date || null,
    visitor_signature: salesRepSignature,
    visitor_signature_name: salesRepName
  };

  // Store visit data in sessionStorage (more reliable than localStorage for this use case)
  const storageKey = 'visitReportData_' + Date.now();
  sessionStorage.setItem(storageKey, JSON.stringify(visitData));

  // Open the template in a new window with the storage key as a parameter
  const templatePath = '/src/components/pdf/visit-report-template.html';
  const url = `${templatePath}?dataKey=${storageKey}`;
  const printWindow = window.open(url, '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to generate PDF. You can also manually open the template file and use the print button.');
    return;
  }

  // Clean up storage after 5 minutes
  setTimeout(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch (e) {
      // Ignore
    }
  }, 300000);
};

