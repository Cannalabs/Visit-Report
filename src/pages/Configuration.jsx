
import React, { useState, useEffect } from "react";
import { Configuration as ConfigEntity } from "@/api/entities";
import { motion } from "framer-motion";
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  List,
  Package,
  Building,
  Building2,
  Upload,
  Download,
  FileUp,
  FileDown
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { UploadFile } from "@/api/integrations";

export default function Configuration() {
  const [configs, setConfigs] = useState([]);
  const [activeTab, setActiveTab] = useState("visit_purposes");
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState(null);

  const [configData, setConfigData] = useState({
    config_type: "visit_purposes",
    config_name: "",
    config_value: "",
    is_active: true,
    display_order: 0
  });

  // Company settings form state
  const [companySettings, setCompanySettings] = useState({
    company_name: "",
    company_address: "",
    company_phone: "",
    company_email: "",
    company_website: "",
    tax_id: "",
    registration_number: "",
    company_logo: ""
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const configTypes = {
    visit_purposes: {
      label: "Visit Purposes",
      icon: List,
      description: "Configure available visit purposes for reports"
    },
    shop_types: {
      label: "Shop Types",
      icon: Building2,
      description: "Configure available shop types for customers and visit reports"
    },
    canna_products: {
      label: "CANNA Products",
      icon: Package,
      description: "Manage CANNA product list for discussions"
    },
    shop_presentation_options: {
      label: "Shop Presentation Matrix",
      icon: Building,
      description: "Configure shop presentation evaluation options"
    },
    competitor_presence: {
      label: "Competitor Presence",
      icon: Building,
      description: "Configure competitor presence level options"
    },
    company_settings: {
      label: "Company Settings",
      icon: Building2,
      description: "Manage company information and settings"
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    // Load company settings when company_settings tab is active
    if (activeTab === "company_settings" && configs.length > 0) {
      loadCompanySettings();
    }
  }, [activeTab, configs]);

  const loadConfigurations = async () => {
    try {
      const data = await ConfigEntity.list("display_order").catch(() => []);
      setConfigs(data);
    } catch (err) {
      setError("Failed to load configurations");
    }
    setIsLoading(false);
  };

  const loadCompanySettings = async () => {
    try {
      const companyConfigs = configs.filter(c => c.config_type === "company_settings");
      const settings = {};
      companyConfigs.forEach(config => {
        settings[config.config_value] = config.config_name;
      });
      setCompanySettings({
        company_name: settings.company_name || "",
        company_address: settings.company_address || "",
        company_phone: settings.company_phone || "",
        company_email: settings.company_email || "",
        company_website: settings.company_website || "",
        tax_id: settings.tax_id || "",
        registration_number: settings.registration_number || "",
        company_logo: settings.company_logo || ""
      });
    } catch (err) {
      // Failed to load company settings
    }
  };

  const handleCompanySettingsSave = async () => {
    try {
      const companyConfigs = configs.filter(c => c.config_type === "company_settings");
      
      // Update or create each company setting
      for (const [key, value] of Object.entries(companySettings)) {
        const existing = companyConfigs.find(c => c.config_value === key);
        
        if (existing) {
          // Update existing
          await ConfigEntity.update(existing.id, {
            config_type: "company_settings",
            config_name: value,
            config_value: key,
            is_active: true,
            display_order: existing.display_order || 0
          });
        } else {
          // Create new
          await ConfigEntity.create({
            config_type: "company_settings",
            config_name: value,
            config_value: key,
            is_active: true,
            display_order: 0
          });
        }
      }
      
      setLastSaved(new Date());
      setSuccess("Company settings saved successfully");
      loadConfigurations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save company settings");
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const result = await UploadFile(file);
      const logoUrl = result?.file_url || result?.url || result;
      if (typeof logoUrl === 'string' && logoUrl.trim().length > 0) {
        setCompanySettings(prev => ({ ...prev, company_logo: logoUrl }));
      }
    } catch (error) {
      setError("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingConfig) {
        await ConfigEntity.update(editingConfig.id, configData);
        setSuccess("Configuration updated successfully");
      } else {
        // Set display_order for new items
        const existingItems = configs.filter(c => c.config_type === configData.config_type);
        const maxOrder = Math.max(...existingItems.map(c => c.display_order || 0), 0);
        
        await ConfigEntity.create({
          ...configData,
          display_order: maxOrder + 1
        });
        setSuccess("Configuration created successfully");
      }
      
      setLastSaved(new Date());
      setShowDialog(false);
      setEditingConfig(null);
      resetForm();
      loadConfigurations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save configuration");
    }
  };

  const handleEdit = (config) => {
    setEditingConfig(config);
    setConfigData(config);
    setShowDialog(true);
  };

  const handleDelete = async (configId) => {
    if (window.confirm("Are you sure you want to delete this configuration item?")) {
      try {
        await ConfigEntity.delete(configId);
        setLastSaved(new Date());
        setSuccess("Configuration deleted successfully");
        loadConfigurations();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError("Failed to delete configuration");
      }
    }
  };

  const toggleActive = async (config) => {
    try {
      await ConfigEntity.update(config.id, { ...config, is_active: !config.is_active });
      setLastSaved(new Date());
      loadConfigurations();
    } catch (err) {
      setError("Failed to update configuration");
    }
  };

  const resetForm = () => {
    setConfigData({
      config_type: activeTab,
      config_name: "",
      config_value: "",
      is_active: true,
      display_order: 0
    });
  };

  const getFilteredConfigs = () => {
    return configs.filter(config => config.config_type === activeTab);
  };

  const handleExportProducts = () => {
    const products = getFilteredConfigs();
    if (products.length === 0) {
      setError("No products to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Export as CSV
    const headers = ['name', 'value', 'is_active', 'display_order'];
    const csvRows = [
      headers.join(','), // Header row
      ...products.map(p => {
        const row = [
          `"${(p.config_name || '').replace(/"/g, '""')}"`,
          `"${(p.config_value || '').replace(/"/g, '""')}"`,
          p.is_active ? 'true' : 'false',
          (p.display_order || 0).toString()
        ];
        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `canna-products-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess("Products exported successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleImportProducts = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      
      // Parse CSV
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header row and one data row.");
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      // Parse data rows
      const importData = lines.slice(1).map(line => {
        // Handle CSV with quoted values
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (insideQuotes && line[i + 1] === '"') {
              // Escaped quote
              currentValue += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              insideQuotes = !insideQuotes;
            }
          } else if (char === ',' && !insideQuotes) {
            // End of value
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        // Add last value
        values.push(currentValue.trim());

        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || '';
        });
        return obj;
      });

      if (importData.length === 0) {
        throw new Error("No valid data rows found in CSV file.");
      }

      // Validate and import products
      const existingProducts = getFilteredConfigs();
      const maxOrder = Math.max(...existingProducts.map(p => p.display_order || 0), 0);
      let importedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        const name = item.name || item.Name || item.config_name || '';
        const value = item.value || item.Value || item.config_value || '';

        if (!name || !value) {
          skippedCount++;
          continue;
        }

        // Check if product already exists
        const exists = existingProducts.some(p => 
          p.config_value === value || p.config_name === name
        );

        if (exists) {
          skippedCount++;
          continue;
        }

        // Parse boolean from CSV (handles "true"/"false" strings or "1"/"0")
        let isActive = true;
        if (item.is_active !== undefined) {
          const activeValue = String(item.is_active).toLowerCase().trim();
          isActive = activeValue === 'true' || activeValue === '1' || activeValue === 'yes';
        }

        // Parse display_order from CSV
        let displayOrder = maxOrder + i + 1;
        if (item.display_order !== undefined && item.display_order !== '') {
          const orderValue = parseInt(item.display_order, 10);
          if (!isNaN(orderValue)) {
            displayOrder = orderValue;
          }
        }

        // Create new product
        await ConfigEntity.create({
          config_type: "canna_products",
          config_name: name,
          config_value: value,
          is_active: isActive,
          display_order: displayOrder
        });
        importedCount++;
      }

      setLastSaved(new Date());
      loadConfigurations();
      setSuccess(`Import completed: ${importedCount} products imported, ${skippedCount} skipped`);
      setTimeout(() => setSuccess(""), 5000);
    } catch (err) {
      setError(`Failed to import products: ${err.message}`);
      setTimeout(() => setError(""), 5000);
    }

    // Reset file input
    event.target.value = '';
  };

  const getDefaultItems = (type) => {
    const defaults = {
      visit_purposes: [
        { name: "Routine Check", value: "routine_check" },
        { name: "Training Session", value: "training" },
        { name: "Product Promotion", value: "promotion" },
        { name: "Complaint Resolution", value: "complaint_resolution" },
        { name: "New Products Introduction", value: "new_products" },
        { name: "Other", value: "other" }
      ],
      shop_types: [
        { name: "Growshop", value: "growshop" },
        { name: "Garden Center", value: "garden_center" },
        { name: "Nursery", value: "nursery" },
        { name: "Hydroponics Store", value: "hydroponics_store" },
        { name: "Other", value: "other" }
      ],
      canna_products: [
        { name: "CANNA Coco", value: "canna_coco" },
        { name: "CANNA Terra", value: "canna_terra" },
        { name: "CANNA Aqua", value: "canna_aqua" },
        { name: "CANNAZYM", value: "cannazym" },
        { name: "RHIZOTONIC", value: "rhizotonic" },
        { name: "PK 13/14", value: "pk_13_14" },
        { name: "BOOST Accelerator", value: "boost_accelerator" },
        { name: "CANNA Start", value: "canna_start" }
      ],
      shop_presentation_options: [
        { name: "Excellent", value: "excellent" },
        { name: "Good", value: "good" },
        { name: "Average", value: "average" },
        { name: "Poor", value: "poor" }
      ],
      competitor_presence: [
        { name: "None - CANNA exclusive", value: "none" },
        { name: "Low - Minimal competition", value: "low" },
        { name: "Medium - Some competitors present", value: "medium" },
        { name: "High - Strong competition", value: "high" }
      ],
      company_settings: [
        { name: "Company Name", value: "company_name" },
        { name: "Company Address", value: "company_address" },
        { name: "Company Phone", value: "company_phone" },
        { name: "Company Email", value: "company_email" },
        { name: "Company Website", value: "company_website" },
        { name: "Tax ID", value: "tax_id" },
        { name: "Registration Number", value: "registration_number" }
      ]
    };
    return defaults[type] || [];
  };

  const addDefaultItems = async (type) => {
    try {
      const defaultItems = getDefaultItems(type);
      const existingItems = configs.filter(c => c.config_type === type);
      
      for (let i = 0; i < defaultItems.length; i++) {
        const item = defaultItems[i];
        const exists = existingItems.some(c => c.config_value === item.value);
        
        if (!exists) {
          await ConfigEntity.create({
            config_type: type,
            config_name: item.name,
            config_value: item.value,
            is_active: true,
            display_order: i + 1
          });
        }
      }
      
      setLastSaved(new Date());
      setSuccess("Default items added successfully");
      loadConfigurations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to add default items");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-screen">
        <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-start"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-600" />
              Configuration
            </h1>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <p className="text-gray-600">
                Manage system configurations and dropdown options
              </p>
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                <Save className="w-4 h-4" />
                <span>Auto-save enabled</span>
              </div>
              {lastSaved && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Configuration Tabs */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              {Object.entries(configTypes).map(([key, config]) => {
                const IconComponent = config.icon;
                return (
                  <Button
                    key={key}
                    variant={activeTab === key ? "default" : "outline"}
                    onClick={() => {
                      setActiveTab(key);
                      resetForm();
                    }}
                    className={activeTab === key ? "bg-blue-600" : ""}
                  >
                    <IconComponent className="w-4 h-4 mr-2" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === "company_settings" ? (
              // Company Settings Form View
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{configTypes[activeTab].label}</h3>
                    <p className="text-sm text-gray-600 mt-1">{configTypes[activeTab].description}</p>
                  </div>
                  <Button
                    onClick={handleCompanySettingsSave}
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm"
                    size="default"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload Section */}
                  <div className="md:col-span-2">
                    <Label className="text-base font-semibold mb-3 block">Company Logo</Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-green-400 transition-colors">
                      {companySettings.company_logo && (
                        <div className="relative flex-shrink-0">
                          <img
                            src={companySettings.company_logo}
                            alt="Company Logo"
                            className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-white p-2 shadow-sm"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 w-full sm:w-auto">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={isUploadingLogo}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Label
                          htmlFor="logo-upload"
                          className="cursor-pointer"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isUploadingLogo}
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            {isUploadingLogo ? (
                              <>
                                <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
                                <span className="text-xs">Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5 mr-1.5" />
                                <span className="text-sm">{companySettings.company_logo ? "Change Logo" : "Upload Logo"}</span>
                              </>
                            )}
                          </Button>
                        </Label>
                        <p className="text-xs text-gray-500 mt-2">
                          Recommended: Square image, max 2MB (PNG, JPG)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label htmlFor="company_name" className="text-sm font-medium text-gray-700">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_name"
                      value={companySettings.company_name}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                      className="h-10"
                    />
                  </div>

                  {/* Company Email */}
                  <div className="space-y-2">
                    <Label htmlFor="company_email" className="text-sm font-medium text-gray-700">
                      Company Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={companySettings.company_email}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_email: e.target.value }))}
                      placeholder="company@example.com"
                      className="h-10"
                    />
                  </div>

                  {/* Company Address */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="company_address" className="text-sm font-medium text-gray-700">
                      Company Address
                    </Label>
                    <Textarea
                      id="company_address"
                      value={companySettings.company_address}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_address: e.target.value }))}
                      placeholder="Enter full company address"
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Company Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="company_phone" className="text-sm font-medium text-gray-700">
                      Company Phone
                    </Label>
                    <Input
                      id="company_phone"
                      type="tel"
                      value={companySettings.company_phone}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_phone: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className="h-10"
                    />
                  </div>

                  {/* Company Website */}
                  <div className="space-y-2">
                    <Label htmlFor="company_website" className="text-sm font-medium text-gray-700">
                      Company Website
                    </Label>
                    <Input
                      id="company_website"
                      type="url"
                      value={companySettings.company_website}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_website: e.target.value }))}
                      placeholder="https://www.example.com"
                      className="h-10"
                    />
                  </div>

                  {/* Tax ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tax_id" className="text-sm font-medium text-gray-700">
                      Tax ID / VAT Number
                    </Label>
                    <Input
                      id="tax_id"
                      value={companySettings.tax_id}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, tax_id: e.target.value }))}
                      placeholder="Enter tax ID"
                      className="h-10"
                    />
                  </div>

                  {/* Registration Number */}
                  <div className="space-y-2">
                    <Label htmlFor="registration_number" className="text-sm font-medium text-gray-700">
                      Registration Number
                    </Label>
                    <Input
                      id="registration_number"
                      value={companySettings.registration_number}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, registration_number: e.target.value }))}
                      placeholder="Enter registration number"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // Regular Table View for other config types
              <>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{configTypes[activeTab].label}</h3>
                    <p className="text-sm text-gray-600">{configTypes[activeTab].description}</p>
                  </div>
                  <div className="flex gap-2">
                    {activeTab === "canna_products" ? (
                      <>
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleImportProducts}
                          className="hidden"
                          id="import-products"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('import-products')?.click()}
                          size="sm"
                        >
                          <FileUp className="w-4 h-4 mr-2" />
                          Import
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleExportProducts}
                          size="sm"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                        <Button
                          onClick={() => {
                            resetForm();
                            setEditingConfig(null);
                            setShowDialog(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => addDefaultItems(activeTab)}
                          size="sm"
                        >
                          Add Defaults
                        </Button>
                        <Button
                          onClick={() => {
                            resetForm();
                            setEditingConfig(null);
                            setShowDialog(true);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Item
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredConfigs().map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.config_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{config.config_value}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={config.is_active}
                          onCheckedChange={() => toggleActive(config)}
                        />
                        <span className={config.is_active ? "text-green-600" : "text-gray-400"}>
                          {config.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{config.display_order || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(config)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(config.id)}
                          className="border-red-200 hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {getFilteredConfigs().length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <Settings className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No configuration items found</p>
                        {activeTab === "canna_products" ? (
                          <Button
                            onClick={() => document.getElementById('import-products')?.click()}
                            variant="outline"
                          >
                            <FileUp className="w-4 h-4 mr-2" />
                            Import Products
                          </Button>
                        ) : (
                          <Button
                            onClick={() => addDefaultItems(activeTab)}
                            variant="outline"
                          >
                            Add Default Items
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
              </>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Configuration Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Configuration" : "Add Configuration Item"}
              </DialogTitle>
              <DialogDescription>
                {editingConfig ? "Update the configuration item details." : "Add a new configuration item to the system."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Configuration Type</Label>
                <Select
                  value={configData.config_type}
                  onValueChange={(value) => setConfigData({...configData, config_type: value})}
                  disabled={!!editingConfig}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(configTypes).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Display Name *</Label>
                <Input
                  value={configData.config_name}
                  onChange={(e) => setConfigData({...configData, config_name: e.target.value})}
                  placeholder="Enter display name"
                />
              </div>

              <div>
                <Label>Value *</Label>
                <Input
                  value={configData.config_value}
                  onChange={(e) => setConfigData({...configData, config_value: e.target.value})}
                  placeholder="Enter value (used internally)"
                />
              </div>

              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={configData.display_order}
                  onChange={(e) => setConfigData({...configData, display_order: parseInt(e.target.value) || 0})}
                  placeholder="Display order"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={configData.is_active}
                  onCheckedChange={(checked) => setConfigData({...configData, is_active: checked})}
                />
                <Label>Active</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  {editingConfig ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
