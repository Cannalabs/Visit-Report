import React, { useState, useEffect } from "react";
import { Customer } from "@/api/entities";
import { User } from "@/api/entities";
import { Configuration } from "@/api/entities";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Building2,
  UserCheck,
  UserX,
  Archive,
  ArchiveRestore,
  X,
  ChevronDown,
  ChevronUp,
  FileUp,
  FileDown,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    shop_type: "",
    phone: "",
    email: "",
    city: "",
    region: "",
    county: ""
  });
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [customerData, setCustomerData] = useState({
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
    shop_timings: "",
    visit_notes: "",
    status: "active",
    region: "",
    gps_coordinates: null
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [shopTypes, setShopTypes] = useState([]);

  useEffect(() => {
    loadCustomers();
    loadShopTypes();
  }, []);

  const loadShopTypes = async () => {
    try {
      const configs = await Configuration.list({ config_type: "shop_types", is_active: true });
      const sorted = configs.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      setShopTypes(sorted);
    } catch (error) {
      console.error("Failed to load shop types:", error);
    }
  };

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter, advancedFilters]);

  const loadCustomers = async () => {
    try {
      const data = await Customer.list("-created_date");
      setCustomers(data);
    } catch (err) {
      setError("Failed to load customers");
    }
    setIsLoading(false);
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Basic search
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.shop_address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    // Advanced filters
    if (advancedFilters.shop_type) {
      filtered = filtered.filter(customer => customer.shop_type === advancedFilters.shop_type);
    }
    if (advancedFilters.phone) {
      filtered = filtered.filter(customer => 
        customer.contact_phone?.toLowerCase().includes(advancedFilters.phone.toLowerCase())
      );
    }
    if (advancedFilters.email) {
      filtered = filtered.filter(customer => 
        customer.contact_email?.toLowerCase().includes(advancedFilters.email.toLowerCase())
      );
    }
    if (advancedFilters.city) {
      filtered = filtered.filter(customer => 
        customer.city?.toLowerCase().includes(advancedFilters.city.toLowerCase())
      );
    }
    if (advancedFilters.region) {
      filtered = filtered.filter(customer => 
        customer.region?.toLowerCase().includes(advancedFilters.region.toLowerCase())
      );
    }
    if (advancedFilters.county) {
      filtered = filtered.filter(customer => 
        customer.county?.toLowerCase().includes(advancedFilters.county.toLowerCase())
      );
    }

    setFilteredCustomers(filtered);
  };

  // Validation helper functions
  const validatePhone = (phone) => {
    if (!phone || phone.trim() === "") return null; // Optional field
    // Allow numbers, spaces, +, -, (, )
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phone)) {
      return "Phone number should contain only numbers and valid characters (+, -, spaces, parentheses)";
    }
    // Check if it has at least some digits
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 5) {
      return "Phone number must contain at least 5 digits";
    }
    return null;
  };

  const validateTextOnly = (value, fieldName) => {
    if (!value || value.trim() === "") return null; // Optional field
    // Allow only alphabets, spaces, hyphens, and apostrophes
    const textRegex = /^[a-zA-Z\s\-'\.]+$/;
    if (!textRegex.test(value)) {
      return `${fieldName} should contain only letters and valid characters`;
    }
    return null;
  };

  const validateEmail = (email) => {
    if (!email || email.trim() === "") return null; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return null;
  };

  const validateAllFields = () => {
    const errors = {};
    
    // Required fields
    const shopName = (customerData.shop_name || "").toString().trim();
    const shopType = (customerData.shop_type || "").toString().trim();
    
    if (!shopName) {
      errors.shop_name = "Shop Name is required";
    } else {
      // Validate shop name format (allow alphanumeric and common characters)
      const shopNameRegex = /^[a-zA-Z0-9\s\-'\.&,]+$/;
      if (!shopNameRegex.test(shopName)) {
        errors.shop_name = "Enter valid text. Shop name contains invalid characters";
      }
    }
    
    if (!shopType) {
      errors.shop_type = "Shop Type is required";
    }
    
    // Optional fields with format validation
    const phoneError = validatePhone(customerData.contact_phone);
    if (phoneError) errors.contact_phone = phoneError;
    
    const emailError = validateEmail(customerData.contact_email);
    if (emailError) errors.contact_email = emailError;
    
    const cityError = validateTextOnly(customerData.city, "City");
    if (cityError) errors.city = cityError;
    
    const countyError = validateTextOnly(customerData.county, "County");
    if (countyError) errors.county = countyError;
    
    const contactPersonError = validateTextOnly(customerData.contact_person, "Contact Person");
    if (contactPersonError) errors.contact_person = contactPersonError;
    
    const jobTitleError = validateTextOnly(customerData.job_title, "Job Title");
    if (jobTitleError) errors.job_title = jobTitleError;
    
    const regionError = validateTextOnly(customerData.region, "Region");
    if (regionError) errors.region = regionError;
    
    return errors;
  };

  const isFormValid = () => {
    const shopName = (customerData.shop_name || "").toString().trim();
    const shopType = (customerData.shop_type || "").toString().trim();
    if (shopName.length === 0 || shopType.length === 0) return false;
    
    // Check for any field errors
    const errors = validateAllFields();
    return Object.keys(errors).length === 0;
  };

  const validateCustomerData = () => {
    const errors = [];
    const fieldErrors = validateAllFields();
    
    if (fieldErrors.shop_name) errors.push(fieldErrors.shop_name);
    if (fieldErrors.shop_type) errors.push(fieldErrors.shop_type);
    if (fieldErrors.contact_phone) errors.push(fieldErrors.contact_phone);
    if (fieldErrors.contact_email) errors.push(fieldErrors.contact_email);
    if (fieldErrors.city) errors.push(fieldErrors.city);
    if (fieldErrors.county) errors.push(fieldErrors.county);
    if (fieldErrors.contact_person) errors.push(fieldErrors.contact_person);
    if (fieldErrors.job_title) errors.push(fieldErrors.job_title);
    if (fieldErrors.region) errors.push(fieldErrors.region);
    
    return errors;
  };

  const handleSave = async (e) => {
    // Prevent any default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Validate all fields
    const fieldErrors = validateAllFields();
    setFieldErrors(fieldErrors);
    
    // Get current values and trim them
    const shopName = (customerData.shop_name || "").toString().trim();
    const shopType = (customerData.shop_type || "").toString().trim();
    
    // STRICT VALIDATION - Check if required fields are empty
    if (!shopName || shopName.length === 0) {
      setError("Shop Name is required and cannot be empty");
      setTimeout(() => setError(""), 5000);
      return; // STOP HERE - Do not proceed
    }
    
    if (!shopType || shopType.length === 0) {
      setError("Shop Type is required and cannot be empty");
      setTimeout(() => setError(""), 5000);
      return; // STOP HERE - Do not proceed
    }
    
    // Check for validation errors
    if (Object.keys(fieldErrors).length > 0) {
      const errorMessages = Object.values(fieldErrors).filter(msg => msg);
      setError(errorMessages.join(", "));
      setTimeout(() => setError(""), 5000);
      return; // STOP HERE - Do not proceed
    }
    
    // Additional validation check
    if (!isFormValid()) {
      setError("Please fill in all required fields correctly");
      setTimeout(() => setError(""), 5000);
      return; // STOP HERE - Do not proceed
    }
    
    // Clear any previous errors
    setError("");
    setFieldErrors({});
    
    try {
      // Prepare clean data with trimmed values
      const cleanData = {
        ...customerData,
        shop_name: shopName,
        shop_type: shopType,
        city: customerData.city?.trim() || "",
        county: customerData.county?.trim() || "",
        contact_person: customerData.contact_person?.trim() || "",
        contact_phone: customerData.contact_phone?.trim() || "",
        contact_email: customerData.contact_email?.trim() || "",
        job_title: customerData.job_title?.trim() || "",
        region: customerData.region?.trim() || "",
        shop_timings: customerData.shop_timings?.trim() || "",
        visit_notes: customerData.visit_notes?.trim() || "",
      };
      
      // Final safety check before API call
      if (!cleanData.shop_name || cleanData.shop_name.trim().length === 0 || 
          !cleanData.shop_type || cleanData.shop_type.trim().length === 0) {
        setError("Shop Name and Shop Type are required");
        setTimeout(() => setError(""), 5000);
        return;
      }
      
      if (editingCustomer) {
        await Customer.update(editingCustomer.id, cleanData);
        setSuccess("Customer updated successfully");
      } else {
        await Customer.create(cleanData);
        setSuccess("Customer created successfully");
      }
      
      setShowDialog(false);
      setEditingCustomer(null);
      resetForm();
      setFieldErrors({});
      loadCustomers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to save customer";
      setError(errorMessage);
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setCustomerData(customer);
    setError("");
    setFieldErrors({});
    setShowDialog(true);
  };

  const handleDelete = async (customerId) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await Customer.delete(customerId);
        setSuccess("Customer deleted successfully");
        loadCustomers();
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        setError("Failed to delete customer");
      }
    }
  };

  const resetForm = () => {
    setCustomerData({
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
      shop_timings: "",
      visit_notes: "",
      status: "active",
      region: "",
      gps_coordinates: null
    });
    setFieldErrors({});
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? 
      <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Active</Badge> :
      <Badge className="bg-red-100 text-red-800"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleSelectOne = (customerId, checked) => {
    if (checked) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    } else {
      setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedCustomers.length === 0) {
      setError("Please select at least one customer");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!window.confirm(`Are you sure you want to archive ${selectedCustomers.length} customer(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedCustomers.map(id => 
          Customer.update(id, { status: "inactive" })
        )
      );
      setSelectedCustomers([]);
      setSuccess(`${selectedCustomers.length} customer(s) archived successfully`);
      loadCustomers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to archive customers");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedCustomers.length === 0) {
      setError("Please select at least one customer");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (!window.confirm(`Are you sure you want to unarchive ${selectedCustomers.length} customer(s)?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedCustomers.map(id => 
          Customer.update(id, { status: "active" })
        )
      );
      setSelectedCustomers([]);
      setSuccess(`${selectedCustomers.length} customer(s) unarchived successfully`);
      loadCustomers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to unarchive customers");
      setTimeout(() => setError(""), 3000);
    }
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      shop_type: "",
      phone: "",
      email: "",
      city: "",
      region: "",
      county: ""
    });
  };

  const handleExportCustomers = () => {
    const customersToExport = filteredCustomers.length > 0 ? filteredCustomers : customers;
    if (customersToExport.length === 0) {
      setError("No customers to export");
      setTimeout(() => setError(""), 3000);
      return;
    }

    // Export as CSV
    const headers = [
      'shop_name', 'shop_type', 'shop_address', 'zipcode', 'city', 'county', 
      'region', 'contact_person', 'contact_phone', 'contact_email', 'job_title', 
      'shop_timings', 'visit_notes', 'status'
    ];
    
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvRows = [
      headers.join(','), // Header row
      ...customersToExport.map(customer => {
        const row = headers.map(header => {
          const value = customer[header] || '';
          return escapeCsv(value);
        });
        return row.join(',');
      })
    ];

    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess("Customers exported successfully");
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleImportCustomers = async (event) => {
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

      // Validate and import customers
      let importedCount = 0;
      let skippedCount = 0;
      const errors = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        const shopName = item.shop_name || item['shop name'] || '';
        const shopType = item.shop_type || item['shop type'] || '';

        if (!shopName || !shopType) {
          skippedCount++;
          errors.push(`Row ${i + 2}: Missing shop_name or shop_type`);
          continue;
        }

        // Check if customer already exists (by shop_name)
        const exists = customers.some(c => 
          c.shop_name?.toLowerCase() === shopName.toLowerCase()
        );

        if (exists) {
          skippedCount++;
          continue;
        }

        try {
          // Prepare customer data
          const customerData = {
            shop_name: shopName.trim(),
            shop_type: shopType.trim(),
            shop_address: (item.shop_address || item['shop address'] || '').trim(),
            zipcode: (item.zipcode || item['zip code'] || '').trim(),
            city: (item.city || '').trim(),
            county: (item.county || '').trim(),
            region: (item.region || '').trim(),
            contact_person: (item.contact_person || item['contact person'] || '').trim(),
            contact_phone: (item.contact_phone || item['contact phone'] || item.phone || '').trim(),
            contact_email: (item.contact_email || item['contact email'] || item.email || '').trim(),
            job_title: (item.job_title || item['job title'] || '').trim(),
            shop_timings: (item.shop_timings || item['shop timings'] || '').trim(),
            visit_notes: (item.visit_notes || item['visit notes'] || '').trim(),
            status: (item.status || 'active').trim().toLowerCase() === 'inactive' ? 'inactive' : 'active'
          };

          await Customer.create(customerData);
          importedCount++;
        } catch (err) {
          skippedCount++;
          errors.push(`Row ${i + 2}: ${err.message || 'Failed to import'}`);
        }
      }

      setLastSaved(new Date());
      loadCustomers();
      
      let message = `Import completed: ${importedCount} customer(s) imported, ${skippedCount} skipped`;
      if (errors.length > 0 && errors.length <= 5) {
        message += `. Errors: ${errors.join('; ')}`;
      } else if (errors.length > 5) {
        message += `. ${errors.length} errors occurred.`;
      }
      
      if (importedCount > 0) {
        setSuccess(message);
      } else {
        setError(message);
      }
      setTimeout(() => {
        setSuccess("");
        setError("");
      }, 5000);
    } catch (err) {
      setError(`Failed to import customers: ${err.message}`);
      setTimeout(() => setError(""), 5000);
    }

    // Reset file input
    event.target.value = '';
  };

  const getShopTypeColor = (type) => {
    const colors = {
      growshop: "bg-green-100 text-green-800",
      garden_center: "bg-blue-100 text-blue-800",
      nursery: "bg-purple-100 text-purple-800",
      hydroponics_store: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800"
    };
    return colors[type] || colors.other;
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
              <Users className="w-8 h-8 text-green-600" />
              Customers & Contacts
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your customer database and contact information
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCustomers}
              className="hidden"
              id="import-customers"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('import-customers')?.click()}
              className="flex items-center gap-2"
            >
              <FileUp className="w-4 h-4" />
              Import
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCustomers}
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setEditingCustomer(null);
                setError("");
                setFieldErrors({});
                setShowDialog(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </motion.div>

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="border-red-500 bg-red-50">
            <AlertDescription className="text-red-800 font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by shop name, contact person, city, phone, email, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className="flex items-center gap-2"
                >
                  <Filter className="w-4 h-4" />
                  Advanced Search
                  {showAdvancedSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              {showAdvancedSearch && (
                <div className="border-t pt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Shop Type</Label>
                      <Select
                        value={advancedFilters.shop_type || "all"}
                        onValueChange={(value) => setAdvancedFilters({...advancedFilters, shop_type: value === "all" ? "" : value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All shop types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All shop types</SelectItem>
                          {shopTypes.map((type) => (
                            <SelectItem key={type.config_value} value={type.config_value}>
                              {type.config_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        placeholder="Search by phone..."
                        value={advancedFilters.phone}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        placeholder="Search by email..."
                        value={advancedFilters.email}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        placeholder="Search by city..."
                        value={advancedFilters.city}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, city: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Region</Label>
                      <Input
                        placeholder="Search by region..."
                        value={advancedFilters.region}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, region: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>County</Label>
                      <Input
                        placeholder="Search by county..."
                        value={advancedFilters.county}
                        onChange={(e) => setAdvancedFilters({...advancedFilters, county: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={clearAdvancedFilters}
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedCustomers.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedCustomers.length} customer(s) selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleBulkArchive}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBulkUnarchive}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <ArchiveRestore className="w-4 h-4" />
                    Unarchive
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCustomers([])}
                    size="sm"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Shop Details</TableHead>
                  <TableHead>Contact Information</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id} className="hover:bg-green-50/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={(checked) => handleSelectOne(customer.id, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-900">{customer.shop_name}</div>
                        <Badge className={getShopTypeColor(customer.shop_type)}>
                          {customer.shop_type?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span className="text-sm">{customer.contact_person || "—"}</span>
                        </div>
                        {customer.contact_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{customer.contact_phone}</span>
                          </div>
                        )}
                        {customer.contact_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{customer.contact_email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {customer.city && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">
                              {customer.city}
                              {customer.region && (
                                <span className="text-gray-500 ml-1">({customer.region})</span>
                              )}
                            </span>
                          </div>
                        )}
                        {!customer.city && customer.region && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-600">{customer.region}</span>
                          </div>
                        )}
                        {customer.zipcode && (
                          <div className="text-sm text-gray-500">{customer.zipcode}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(customer)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(customer.id)}
                          className="border-red-200 hover:bg-red-50 text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-gray-300" />
                        <p className="text-gray-500">No customers found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Customer Dialog */}
        <Dialog 
          open={showDialog} 
          onOpenChange={(open) => {
            if (!open) {
              // Only allow closing if no validation errors
              setError("");
              setFieldErrors({});
              resetForm();
              setEditingCustomer(null);
            }
            setShowDialog(open);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer information." : "Add a new customer to the system."}
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive" className="border-red-500 bg-red-50">
                <AlertDescription className="text-red-800 font-semibold">{error}</AlertDescription>
              </Alert>
            )}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isFormValid()) {
                  handleSave(e);
                } else {
                  const errors = validateCustomerData();
                  setError(errors.length > 0 ? errors.join(", ") : "Please fill in all required fields");
                  setTimeout(() => setError(""), 5000);
                }
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="shop_name">Shop Name *</Label>
                  <Input
                    id="shop_name"
                    value={customerData.shop_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow alphanumeric and common business name characters
                      if (value === "" || /^[a-zA-Z0-9\s\-'\.&,]*$/.test(value)) {
                        setCustomerData({...customerData, shop_name: value});
                        const errors = validateAllFields();
                        setFieldErrors({...fieldErrors, shop_name: errors.shop_name || undefined});
                      }
                    }}
                    placeholder="Enter shop name"
                    required
                    className={(!customerData.shop_name || customerData.shop_name.trim() === "" || fieldErrors.shop_name) ? "border-red-300" : ""}
                  />
                  {fieldErrors.shop_name && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.shop_name}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="shop_type">Shop Type *</Label>
                  <Select
                    value={customerData.shop_type}
                    onValueChange={(value) => setCustomerData({...customerData, shop_type: value})}
                    required
                  >
                    <SelectTrigger 
                      id="shop_type"
                      className={!customerData.shop_type || customerData.shop_type.trim() === "" ? "border-red-300" : ""}
                    >
                      <SelectValue placeholder="Select shop type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="growshop">Growshop</SelectItem>
                      <SelectItem value="garden_center">Garden Center</SelectItem>
                      <SelectItem value="nursery">Nursery</SelectItem>
                      <SelectItem value="hydroponics_store">Hydroponics Store</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Shop Address</Label>
                <Input
                  value={customerData.shop_address}
                  onChange={(e) => setCustomerData({...customerData, shop_address: e.target.value})}
                  placeholder="Enter full address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>ZIP Code</Label>
                  <Input
                    value={customerData.zipcode}
                    onChange={(e) => setCustomerData({...customerData, zipcode: e.target.value})}
                    placeholder="ZIP code"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={customerData.city}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow letters, spaces, hyphens, apostrophes, and periods
                      if (value === "" || /^[a-zA-Z\s\-'\.]*$/.test(value)) {
                        setCustomerData({...customerData, city: value});
                        const error = validateTextOnly(value, "City");
                        setFieldErrors({...fieldErrors, city: error || undefined});
                      }
                    }}
                    placeholder="City"
                    className={fieldErrors.city ? "border-red-300" : ""}
                  />
                  {fieldErrors.city && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.city}</p>
                  )}
                </div>
                <div>
                  <Label>County</Label>
                  <Input
                    value={customerData.county}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow letters, spaces, hyphens, apostrophes, and periods
                      if (value === "" || /^[a-zA-Z\s\-'\.]*$/.test(value)) {
                        setCustomerData({...customerData, county: value});
                        const error = validateTextOnly(value, "County");
                        setFieldErrors({...fieldErrors, county: error || undefined});
                      }
                    }}
                    placeholder="County"
                    className={fieldErrors.county ? "border-red-300" : ""}
                  />
                  {fieldErrors.county && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.county}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={customerData.contact_person}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow letters, spaces, hyphens, apostrophes, and periods
                      if (value === "" || /^[a-zA-Z\s\-'\.]*$/.test(value)) {
                        setCustomerData({...customerData, contact_person: value});
                        const error = validateTextOnly(value, "Contact Person");
                        setFieldErrors({...fieldErrors, contact_person: error || undefined});
                      }
                    }}
                    placeholder="Contact name"
                    className={fieldErrors.contact_person ? "border-red-300" : ""}
                  />
                  {fieldErrors.contact_person && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.contact_person}</p>
                  )}
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={customerData.job_title}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow letters, spaces, hyphens, apostrophes, and periods
                      if (value === "" || /^[a-zA-Z\s\-'\.]*$/.test(value)) {
                        setCustomerData({...customerData, job_title: value});
                        const error = validateTextOnly(value, "Job Title");
                        setFieldErrors({...fieldErrors, job_title: error || undefined});
                      }
                    }}
                    placeholder="Job title"
                    className={fieldErrors.job_title ? "border-red-300" : ""}
                  />
                  {fieldErrors.job_title && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.job_title}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={customerData.contact_phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow numbers, spaces, +, -, (, )
                      if (value === "" || /^[\d\s\+\-\(\)]*$/.test(value)) {
                        setCustomerData({...customerData, contact_phone: value});
                        const error = validatePhone(value);
                        setFieldErrors({...fieldErrors, contact_phone: error || undefined});
                      }
                    }}
                    placeholder="Phone number"
                    className={fieldErrors.contact_phone ? "border-red-300" : ""}
                  />
                  {fieldErrors.contact_phone && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.contact_phone}</p>
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={customerData.contact_email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerData({...customerData, contact_email: value});
                      const error = validateEmail(value);
                      setFieldErrors({...fieldErrors, contact_email: error || undefined});
                    }}
                    placeholder="Email address"
                    className={fieldErrors.contact_email ? "border-red-300" : ""}
                  />
                  {fieldErrors.contact_email && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.contact_email}</p>
                  )}
                </div>
              </div>

              <div>
                <Label>Shop Timings</Label>
                <Textarea
                  value={customerData.shop_timings}
                  onChange={(e) => setCustomerData({...customerData, shop_timings: e.target.value})}
                  placeholder="e.g., Mon-Fri: 9:00 AM - 6:00 PM, Sat: 10:00 AM - 4:00 PM"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter working hours (optional)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visit_notes">Visit Notes</Label>
                <Textarea
                  id="visit_notes"
                  value={customerData.visit_notes}
                  onChange={(e) => setCustomerData({...customerData, visit_notes: e.target.value})}
                  placeholder="Add notes for future visits (e.g., 'Bring new samples on next visit', 'Customer requested product demo', etc.)"
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Notes that will be displayed when creating a new visit for this shop (optional)
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={customerData.status}
                    onValueChange={(value) => setCustomerData({...customerData, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Region</Label>
                  <Input
                    value={customerData.region}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow letters, spaces, hyphens, apostrophes, and periods
                      if (value === "" || /^[a-zA-Z\s\-'\.]*$/.test(value)) {
                        setCustomerData({...customerData, region: value});
                        const error = validateTextOnly(value, "Region");
                        setFieldErrors({...fieldErrors, region: error || undefined});
                      }
                    }}
                    placeholder="Sales region"
                    className={fieldErrors.region ? "border-red-300" : ""}
                  />
                  {fieldErrors.region && (
                    <p className="text-sm text-red-600 mt-1">{fieldErrors.region}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => {
                    setShowDialog(false);
                    setError("");
                    setFieldErrors({});
                    resetForm();
                    setEditingCustomer(null);
                  }}
                >
                  Cancel
                </Button>
                {isFormValid() && (
                  <Button 
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {editingCustomer ? "Update Customer" : "Create Customer"}
                  </Button>
                )}
                {!isFormValid() && (
                  <div className="flex items-center text-sm text-red-600 font-medium">
                    Please fill in Shop Name and Shop Type to continue
                  </div>
                )}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}