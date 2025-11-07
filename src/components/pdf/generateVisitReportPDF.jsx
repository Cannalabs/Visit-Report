import jsPDF from 'jspdf';
import { format } from 'date-fns';

export const generateVisitReportPDF = (formData, user) => {
  const doc = new jsPDF();
  
  // --- HELPERS ---
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let currentY = 20;
  
  const addNewPageIfNeeded = (requiredHeight) => {
    if (currentY + requiredHeight > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
  };
  
  const addHeader = () => {
    // CANNA Logo (using text since we can't guarantee image loading)
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(46, 125, 50); // CANNA Green
    doc.text('CANNA', margin, currentY);
    
    // Title
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text('Shop Visit Report', pageWidth / 2, currentY, { align: 'center' });
    currentY += 20;
    
    // Date and Rep info
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${formData.visit_date || 'N/A'}`, margin, currentY);
    doc.text(`Sales Rep: ${user?.full_name || 'N/A'}`, pageWidth - margin - 60, currentY);
    currentY += 15;
    
    // Shop name
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Shop: ${formData.shop_name || 'N/A'}`, margin, currentY);
    currentY += 20;
  };
  
  const addSection = (title, content) => {
    addNewPageIfNeeded(30);
    
    // Section title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text(title, margin, currentY);
    currentY += 10;
    
    // Section content
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    if (Array.isArray(content)) {
      content.forEach(item => {
        addNewPageIfNeeded(8);
        doc.text(item, margin + 5, currentY);
        currentY += 8;
      });
    } else {
      const lines = doc.splitTextToSize(content, pageWidth - (2 * margin));
      lines.forEach(line => {
        addNewPageIfNeeded(8);
        doc.text(line, margin + 5, currentY);
        currentY += 8;
      });
    }
    currentY += 10;
  };
  
  const addTable = (title, data) => {
    addNewPageIfNeeded(30);
    
    // Table title
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text(title, margin, currentY);
    currentY += 15;
    
    // Table content
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    
    data.forEach((row, index) => {
      addNewPageIfNeeded(8);
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, currentY - 6, pageWidth - (2 * margin), 8, 'F');
      }
      
      // Row content
      const col1Width = (pageWidth - (2 * margin)) * 0.4;
      const col2Width = (pageWidth - (2 * margin)) * 0.6;
      
      doc.text(row[0], margin + 2, currentY);
      doc.text(String(row[1]), margin + col1Width + 2, currentY);
      currentY += 8;
    });
    currentY += 10;
  };
  
  // --- CONTENT GENERATION ---
  addHeader();
  
  // Shop Details
  const shopDetails = [
    ['Shop Address', formData.shop_address || 'N/A'],
    ['Contact Person', formData.contact_person || 'N/A'],
    ['Phone', formData.contact_phone || 'N/A'],
    ['Email', formData.contact_email || 'N/A'],
    ['Shop Type', formData.shop_type?.replace('_', ' ') || 'N/A'],
    ['Visit Duration', `${formData.visit_duration || 0} minutes`],
    ['Visit Purpose', formData.visit_purpose?.replace('_', ' ') || 'N/A']
  ];
  addTable('Shop Details', shopDetails);
  
  // Product Visibility
  const salesData = formData.sales_data || {};
  const visibilityDetails = [
    ['Product Visibility Score', `${formData.product_visibility_score || 0}/100`],
    ['Competitor Presence', formData.competitor_presence || 'N/A'],
    ['Organic Percentage', `${salesData.organic_percentage || 0}%`],
    ['Mineral Percentage', `${100 - (salesData.organic_percentage || 0)}%`],
    ['Liquids Percentage', `${salesData.liquids_percentage || 0}%`],
    ['Substrates Percentage', `${100 - (salesData.liquids_percentage || 0)}%`]
  ];
  addTable('Product Visibility & Sales Data', visibilityDetails);
  
  // Sales Trends
  if (salesData.liquids_trend || salesData.substrates_trend) {
    const trendsDetails = [
      ['Liquids Trend', `${salesData.liquids_trend || 'stable'} (${salesData.liquids_trend_percentage || 0}%)`],
      ['Substrates Trend', `${salesData.substrates_trend || 'stable'} (${salesData.substrates_trend_percentage || 0}%)`]
    ];
    addTable('Sales Trends', trendsDetails);
  }
  
  // Top Brands
  if (salesData.liquid_brands?.length > 0) {
    const liquidBrands = salesData.liquid_brands.map(brand => [brand.name, `${brand.percentage}%`]);
    addTable('Top Liquid Brands', liquidBrands);
  }
  
  if (salesData.substrate_brands?.length > 0) {
    const substrateBrands = salesData.substrate_brands.map(brand => [brand.name, `${brand.percentage}%`]);
    addTable('Top Substrate Brands', substrateBrands);
  }
  
  // Commercial Outcomes
  const commercialDetails = [
    ['Commercial Outcome', formData.commercial_outcome?.replace('_', ' ') || 'N/A'],
    ['Order Value', `€${formData.order_value || 0}`],
    ['Overall Satisfaction', `${formData.overall_satisfaction || 0}/10`]
  ];
  addTable('Commercial Outcomes', commercialDetails);
  
  // Training & Support
  if (formData.training_provided) {
    const trainingContent = [
      'Training was provided during this visit.',
      `Topics covered: ${formData.training_topics?.join(', ') || 'None specified'}`,
      `Support materials left: ${formData.support_materials_left ? 'Yes' : 'No'}`
    ];
    addSection('Training & Support', trainingContent);
  }
  
  // Products Discussed
  if (formData.products_discussed?.length > 0) {
    addSection('CANNA Products Discussed', formData.products_discussed.join(', '));
  }
  
  // Notes
  if (formData.notes) {
    addSection('Additional Notes', formData.notes);
  }
  
  // Follow-up
  if (formData.follow_up_required) {
    const followUpContent = [
      'Follow-up action is required for this visit.',
      formData.follow_up_notes || 'No specific follow-up notes provided.'
    ];
    addSection('Follow-up Actions', followUpContent);
  }
  
  // Signature
  if (formData.signature) {
    addNewPageIfNeeded(60);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(46, 125, 50);
    doc.text('E-Signature', margin, currentY);
    currentY += 15;
    
    try {
      doc.addImage(formData.signature, 'PNG', margin, currentY, 80, 30);
      currentY += 35;
    } catch (error) {
      console.warn('Could not add signature image:', error);
      doc.text('Signature captured but could not be displayed in PDF', margin, currentY);
      currentY += 10;
    }
    
    doc.setFontSize(10);
    doc.text(`Signed by: ${formData.signature_signer_name || 'N/A'}`, margin, currentY);
    currentY += 6;
    doc.text(`Date: ${formData.signature_date ? format(new Date(formData.signature_date), 'yyyy-MM-dd HH:mm') : 'N/A'}`, margin, currentY);
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
    doc.text('Confidential | Powered by CANNA', margin, pageHeight - 10);
  }
  
  doc.save(`CANNA-Visit-Report-${formData.shop_name}-${formData.visit_date}.pdf`);
};