
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
  Building
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Configuration() {
  const [configs, setConfigs] = useState([]);
  const [activeTab, setActiveTab] = useState("visit_purposes");
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [configData, setConfigData] = useState({
    config_type: "visit_purposes",
    config_name: "",
    config_value: "",
    is_active: true,
    display_order: 0
  });

  const configTypes = {
    visit_purposes: {
      label: "Visit Purposes",
      icon: List,
      description: "Configure available visit purposes for reports"
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
    }
  };

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const data = await ConfigEntity.list("display_order");
      setConfigs(data);
    } catch (err) {
      setError("Failed to load configurations");
    }
    setIsLoading(false);
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
            <p className="text-gray-600 mt-2">
              Manage system configurations and dropdown options
            </p>
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
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold">{configTypes[activeTab].label}</h3>
                <p className="text-sm text-gray-600">{configTypes[activeTab].description}</p>
              </div>
              <div className="flex gap-2">
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
                        <Button
                          onClick={() => addDefaultItems(activeTab)}
                          variant="outline"
                        >
                          Add Default Items
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Configuration Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Configuration" : "Add Configuration Item"}
              </DialogTitle>
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
