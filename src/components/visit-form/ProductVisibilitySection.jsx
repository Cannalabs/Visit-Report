import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, Plus, X, Package, TrendingUp, Building2 } from "lucide-react";
import { Configuration } from "@/api/entities";

import SalesPurchaseBreakdown from "./SalesPurchaseBreakdown";

export default function ProductVisibilitySection({ formData, updateFormData }) {
  const [newProduct, setNewProduct] = React.useState("");
  const [cannaProducts, setCannaProducts] = useState([]);
  const [competitorOptions, setCompetitorOptions] = useState([]);
  const [hasProductConfigs, setHasProductConfigs] = useState(false); // Track if any products are configured
  const [hasCompetitorConfigs, setHasCompetitorConfigs] = useState(false); // Track if any competitor options are configured

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      const configs = await Configuration.list();
      // Check if any products are configured at all (active or inactive)
      const allProducts = configs.filter(c => c.config_type === 'canna_products');
      setHasProductConfigs(allProducts.length > 0);
      
      // Check if any competitor options are configured at all (active or inactive)
      const allCompetitors = configs.filter(c => c.config_type === 'competitor_presence');
      setHasCompetitorConfigs(allCompetitors.length > 0);
      
      // Only show active products
      const products = allProducts.filter(c => c.is_active)
                                  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      const competitors = allCompetitors.filter(c => c.is_active)
                                        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
      
      setCannaProducts(products);
      setCompetitorOptions(competitors);
    } catch (error) {
      // Failed to load configurations
    }
  };

  const addProduct = () => {
    if (newProduct && !formData.products_discussed.includes(newProduct)) {
      updateFormData({
        products_discussed: [...formData.products_discussed, newProduct]
      });
      setNewProduct("");
    }
  };

  const removeProduct = (product) => {
    updateFormData({
      products_discussed: formData.products_discussed.filter(p => p !== product)
    });
  };

  // Validation styles for required fields
  const getFieldStyle = (value, isRequired = false) => {
    if (isRequired && (!value || value === 0)) {
      return "border-red-300 bg-red-50 focus:border-red-500";
    }
    return "border-green-200 focus:border-green-500";
  };

  const renderRequiredAsterisk = () => (
    <span className="text-red-500 font-bold">*</span>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Eye className="w-5 h-5" />
            Product Visibility Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product_visibility_score" className="flex items-center gap-1">
              Overall Product Visibility Score (0-100) {renderRequiredAsterisk()}
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="product_visibility_score"
                type="range"
                min="0"
                max="100"
                value={formData.product_visibility_score ?? 50}
                onChange={(e) => updateFormData({ product_visibility_score: parseInt(e.target.value) })}
                className={`flex-1 ${getFieldStyle(formData.product_visibility_score, true)}`}
              />
              <div className="w-16 text-center font-bold text-lg text-green-600">
                {formData.product_visibility_score ?? 50}
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Poor visibility</span>
              <span>Excellent visibility</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitor_presence" className="flex items-center gap-1">
              Competitor Presence {renderRequiredAsterisk()}
            </Label>
            {hasCompetitorConfigs && competitorOptions.length === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50 mb-2">
                <AlertDescription className="text-yellow-800">
                  All competitor presence options are currently inactive. Please enable competitor presence options from the Configuration page.
                </AlertDescription>
              </Alert>
            )}
            <Select
              value={formData.competitor_presence || ""}
              onValueChange={(value) => updateFormData({ competitor_presence: value })}
              disabled={hasCompetitorConfigs && competitorOptions.length === 0}
            >
              <SelectTrigger className={getFieldStyle(formData.competitor_presence, true)} disabled={hasCompetitorConfigs && competitorOptions.length === 0}>
                <SelectValue placeholder={hasCompetitorConfigs && competitorOptions.length === 0 ? "No active competitor options available" : "Select competitor presence level"} />
              </SelectTrigger>
              <SelectContent>
                {competitorOptions.length > 0 ? (
                  competitorOptions.map((option) => (
                    <SelectItem key={option.id} value={option.config_value}>
                      {option.config_name}
                    </SelectItem>
                  ))
                ) : hasCompetitorConfigs ? (
                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                    No active competitor options available
                  </div>
                ) : (
                  // Fallback options only if no configurations exist at all
                  <>
                    <SelectItem value="none">None - CANNA exclusive</SelectItem>
                    <SelectItem value="low">Low - Minimal competition</SelectItem>
                    <SelectItem value="medium">Medium - Some competitors present</SelectItem>
                    <SelectItem value="high">High - Strong competition</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            CANNA Products Discussed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasProductConfigs && cannaProducts.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> All products are currently inactive. Please activate products in the Configuration page to select them.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Select
              value={newProduct}
              onValueChange={setNewProduct}
              disabled={hasProductConfigs && cannaProducts.length === 0}
            >
              <SelectTrigger className="flex-1 border-green-200" disabled={hasProductConfigs && cannaProducts.length === 0}>
                <SelectValue placeholder={hasProductConfigs && cannaProducts.length === 0 ? "No active products available" : "Select CANNA product"} />
              </SelectTrigger>
              <SelectContent>
                {cannaProducts.length > 0 ? (
                  cannaProducts
                    .filter(p => !formData.products_discussed.includes(p.config_value))
                    .map(product => (
                      <SelectItem key={product.id} value={product.config_value}>
                        {product.config_name}
                      </SelectItem>
                    ))
                ) : hasProductConfigs ? (
                  // Products are configured but all are inactive - show empty state
                  <div className="px-2 py-6 text-center text-sm text-gray-500">
                    No active products available
                  </div>
                ) : (
                  // Fallback products only if no products are configured at all
                  ["CANNA Coco", "CANNA Terra", "CANNA Aqua", "CANNAZYM", "RHIZOTONIC", "PK 13/14", "BOOST Accelerator", "CANNA Start", "COGR Boards", "FLUSH"]
                    .filter(p => !formData.products_discussed.includes(p))
                    .map(product => (
                      <SelectItem key={product} value={product}>
                        {product}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={addProduct}
              disabled={!newProduct || (hasProductConfigs && cannaProducts.length === 0)}
              size="icon"
              variant="outline"
              className="border-green-200 hover:bg-green-50"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.products_discussed.map(product => (
              <Badge
                key={product}
                variant="secondary"
                className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1"
              >
                {product}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-4 w-4 p-0 hover:bg-green-200"
                  onClick={() => removeProduct(product)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
            
            {formData.products_discussed.length === 0 && (
              <p className="text-gray-500 text-sm py-4">
                No products selected yet. Choose products from the dropdown above.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <SalesPurchaseBreakdown 
        formData={formData} 
        updateFormData={updateFormData} 
      />
    </div>
  );
}