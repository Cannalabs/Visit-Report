import React, { useState, useEffect } from "react";
import { Customer } from "@/api/entities";
import { User } from "@/api/entities";
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
  UserX
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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
    status: "active",
    region: "",
    gps_coordinates: null
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm, statusFilter]);

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

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.city?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    setFilteredCustomers(filtered);
  };

  const handleSave = async () => {
    try {
      if (editingCustomer) {
        await Customer.update(editingCustomer.id, customerData);
        setSuccess("Customer updated successfully");
      } else {
        await Customer.create(customerData);
        setSuccess("Customer created successfully");
      }
      
      setShowDialog(false);
      setEditingCustomer(null);
      resetForm();
      loadCustomers();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save customer");
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setCustomerData(customer);
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
      status: "active",
      region: "",
      gps_coordinates: null
    });
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? 
      <Badge className="bg-green-100 text-green-800"><UserCheck className="w-3 h-3 mr-1" />Active</Badge> :
      <Badge className="bg-red-100 text-red-800"><UserX className="w-3 h-3 mr-1" />Inactive</Badge>;
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
          <Button
            onClick={() => {
              resetForm();
              setEditingCustomer(null);
              setShowDialog(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
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

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by shop name, contact person, or city..."
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
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-green-50">
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
                            <span className="text-sm">{customer.city}</span>
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
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Shop Name *</Label>
                  <Input
                    value={customerData.shop_name}
                    onChange={(e) => setCustomerData({...customerData, shop_name: e.target.value})}
                    placeholder="Enter shop name"
                  />
                </div>
                <div>
                  <Label>Shop Type *</Label>
                  <Select
                    value={customerData.shop_type}
                    onValueChange={(value) => setCustomerData({...customerData, shop_type: value})}
                  >
                    <SelectTrigger>
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
                    onChange={(e) => setCustomerData({...customerData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>County</Label>
                  <Input
                    value={customerData.county}
                    onChange={(e) => setCustomerData({...customerData, county: e.target.value})}
                    placeholder="County"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={customerData.contact_person}
                    onChange={(e) => setCustomerData({...customerData, contact_person: e.target.value})}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <Label>Job Title</Label>
                  <Input
                    value={customerData.job_title}
                    onChange={(e) => setCustomerData({...customerData, job_title: e.target.value})}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={customerData.contact_phone}
                    onChange={(e) => setCustomerData({...customerData, contact_phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={customerData.contact_email}
                    onChange={(e) => setCustomerData({...customerData, contact_email: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
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
                    onChange={(e) => setCustomerData({...customerData, region: e.target.value})}
                    placeholder="Sales region"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                  {editingCustomer ? "Update Customer" : "Create Customer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}