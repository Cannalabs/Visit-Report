import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  TrendingDown,
  Warehouse,
  Briefcase,
  Store,
  Plus,
  X,
  Star } from
"lucide-react";

// Star Rating Component
const StarRating = ({ value, onChange }) => {
  const ratingMap = { excellent: 5, good: 4, better: 3, average: 2, poor: 1 };
  const valueMap = { 5: 'excellent', 4: 'good', 3: 'better', 2: 'average', 1: 'poor' };

  const numericValue = ratingMap[value] || 0;

  return (
    <div className="flex items-center space-x-1 sm:space-x-2">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button type="button" key={ratingValue} onClick={() => onChange(valueMap[ratingValue])} className="focus:outline-none p-1 -m-1">
            <Star
              className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${
              ratingValue <= numericValue ?
              "text-yellow-400 fill-yellow-400" :
              "text-gray-300 hover:text-yellow-300"}`
              } />

          </button>);

      })}
    </div>);

};

export default function SalesPurchaseBreakdown({ formData, updateFormData }) {
  const salesData = formData.sales_data || {};

  const updateSalesData = (updates) => {
    const newSalesData = { ...salesData, ...updates };

    if (updates.organic_percentage !== undefined) {
      newSalesData.mineral_percentage = 100 - (newSalesData.organic_percentage || 0);
    }

    if (updates.liquids_percentage !== undefined) {
      newSalesData.substrates_percentage = 100 - (newSalesData.liquids_percentage || 0);
    }

    if (updates.german_purchase_percentage !== undefined) {
      newSalesData.european_purchase_percentage = 100 - (newSalesData.german_purchase_percentage || 0);
    }

    updateFormData({
      sales_data: newSalesData
    });
  };

  const updateBrandField = (brandType, index, field, value) => {
    const brands = [...(salesData[brandType] || [])];
    brands[index] = { ...brands[index], [field]: field === 'percentage' ? parseFloat(value) || 0 : value };
    updateSalesData({ [brandType]: brands });
  };

  const addBrand = (brandType) => {
    const brands = [...(salesData[brandType] || []), { name: "", percentage: 0 }];
    if (brands.length > 5) return;
    updateSalesData({ [brandType]: brands });
  };

  const removeBrand = (brandType, index) => {
    const brands = (salesData[brandType] || []).filter((_, i) => i !== index);
    updateSalesData({ [brandType]: brands });
  };

  const updateDistributorField = (distType, index, field, value) => {
    const distributors = [...(salesData[distType] || [])];
    distributors[index] = { ...distributors[index], [field]: field === 'percentage' ? parseFloat(value) || 0 : value };
    updateSalesData({ [distType]: distributors });
  };

  const addDistributor = (distType) => {
    const distributors = [...(salesData[distType] || []), { name: "", percentage: 0 }];
    if (distributors.length > 6) return;
    updateSalesData({ [distType]: distributors });
  };

  const removeDistributor = (distType, index) => {
    const distributors = (salesData[distType] || []).filter((_, i) => i !== index);
    updateSalesData({ [distType]: distributors });
  };

  const updateEmployeeSize = (size, value) => {
    const employeeSizes = { ...(salesData.employee_sizes || {}), [size]: parseInt(value) || 0 };
    updateSalesData({ employee_sizes: employeeSizes });
  };

  const updateShopPresentation = (field, value) => {
    const shopPresentation = { ...(salesData.shop_presentation || {}), [field]: value };
    updateSalesData({ shop_presentation: shopPresentation });
  };

  const getFieldStyle = (value, isRequired = false) => {
    if (isRequired && (value === undefined || value === '')) {
      return "border-red-300 bg-red-50 focus:border-red-500";
    }
    return "border-green-200 focus:border-green-500";
  };

  const renderRequiredAsterisk = () => <span className="text-red-500 font-bold">*</span>;

  const calculateTotalPercentage = (items) => items.reduce((sum, item) => sum + (item.percentage || 0), 0);

  const liquidBrandsTotal = calculateTotalPercentage(salesData.liquid_brands || []);
  const substrateBrandsTotal = calculateTotalPercentage(salesData.substrate_brands || []);
  const germanDistributorsTotal = calculateTotalPercentage(salesData.german_distributors || []);
  const totalEmployeesAssigned = Object.values(salesData.employee_sizes || {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4">
      {/* Bento Box Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Sales Liquids - Bento Box */}
        <Card className="bg-blue-50/50 border-blue-200 shadow-sm">
          <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="flex items-center gap-2 text-blue-800 text-sm md:text-base">
              <TrendingUp className="w-4 h-4" />
              Sales Liquids
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            <div className="space-y-2">
              <Label htmlFor="organic_percentage" className="text-sm">Organic {renderRequiredAsterisk()}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="organic_percentage"
                  type="number" min="0" max="100"
                  value={salesData.organic_percentage ?? ""}
                  onChange={(e) => updateSalesData({ organic_percentage: parseFloat(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 ${getFieldStyle(salesData.organic_percentage, true)}`}
                  placeholder="0" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Mineral (Auto-calculated)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={100 - (salesData.organic_percentage || 0)}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-100 cursor-not-allowed" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Value - Bento Box */}
        <Card className="bg-green-50/50 border-green-200 shadow-sm md:col-span-2">
          <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="flex items-center gap-2 text-green-800 text-sm md:text-base">
              <DollarSign className="w-4 h-4" />
              Purchase Value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6">
            {/* Estimated Total - Full Width on Top */}
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
              <Label htmlFor="estimated_canna_value" className="text-sm whitespace-nowrap md:min-w-[160px]">Estimated Total (K€) {renderRequiredAsterisk()}</Label>
              <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap flex-shrink-0">€</span>
                <Input
                  id="estimated_canna_value"
                  type="number" min="0" step="0.1"
                  value={salesData.estimated_canna_value ?? ""}
                  onChange={(e) => updateSalesData({ estimated_canna_value: parseFloat(e.target.value) || 0 })}
                  className={`flex-1 px-3 py-2 min-w-0 ${getFieldStyle(salesData.estimated_canna_value, true)}`}
                  placeholder="0.0" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap flex-shrink-0">K€</span>
              </div>
            </div>
            
            {/* CANNA Liquids and Substrates - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="liquids_percentage" className="text-sm">CANNA Liquids {renderRequiredAsterisk()}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="liquids_percentage"
                    type="number" min="0" max="100"
                    value={salesData.liquids_percentage ?? ""}
                    onChange={(e) => updateSalesData({ liquids_percentage: parseFloat(e.target.value) || 0 })}
                    className={`flex-1 px-3 py-2 min-w-0 ${getFieldStyle(salesData.liquids_percentage, true)}`}
                    placeholder="0" />
                  <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px] flex-shrink-0">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">CANNA Substrates</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={100 - (salesData.liquids_percentage || 0)}
                    readOnly
                    className="flex-1 px-3 py-2 min-w-0 bg-gray-100 cursor-not-allowed" />
                  <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px] flex-shrink-0">%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trends - Bento Box */}
      <Card className="bg-purple-50/50 border-purple-200 shadow-sm">
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-purple-800 text-sm md:text-base">
            <TrendingDown className="w-4 h-4" />
            Sales Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6">
          <div className="space-y-3 p-3 md:p-4 bg-white rounded-lg border border-purple-200">
            <Label className="font-semibold text-sm">Liquids Trend</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Select value={salesData.liquids_trend || ""} onValueChange={(value) => updateSalesData({ liquids_trend: value })}>
                <SelectTrigger className="border-purple-200">
                  <SelectValue placeholder="Select trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increasing">Increasing</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="decreasing">Decreasing</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={salesData.liquids_trend_percentage ?? ""}
                  onChange={(e) => updateSalesData({ liquids_trend_percentage: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 min-w-0 border-purple-200"
                  placeholder="0" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px] flex-shrink-0">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 p-3 md:p-4 bg-white rounded-lg border border-purple-200">
            <Label className="font-semibold text-sm">Substrates Trend</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <Select value={salesData.substrates_trend || ""} onValueChange={(value) => updateSalesData({ substrates_trend: value })}>
                <SelectTrigger className="border-purple-200">
                  <SelectValue placeholder="Select trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increasing">Increasing</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="decreasing">Decreasing</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={salesData.substrates_trend_percentage ?? ""}
                  onChange={(e) => updateSalesData({ substrates_trend_percentage: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 min-w-0 border-purple-200"
                  placeholder="0" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Brands - Bento Box Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-yellow-50/50 border-yellow-200 shadow-sm">
          <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-yellow-800 text-sm md:text-base font-semibold">Top Liquid Brands % Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            <div className="space-y-2">
              {salesData.liquid_brands?.map((brand, index) =>
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-white rounded-lg border border-yellow-200">
                  <Input
                  value={brand.name || ""}
                  onChange={(e) => updateBrandField('liquid_brands', index, 'name', e.target.value)}
                  placeholder="Brand name"
                  className="flex-1 px-3 py-2 border-yellow-200" />

                  <div className="flex items-center gap-2">
                    <Input
                    type="number" min="0" max="100"
                    value={brand.percentage ?? ""}
                    onChange={(e) => updateBrandField('liquid_brands', index, 'percentage', e.target.value)}
                    className="w-28 px-3 py-2 border-yellow-200"
                    placeholder="0" />
                    <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBrand('liquid_brands', index)} className="text-red-500 hover:bg-red-100 h-9 w-9">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                <Label className="font-semibold text-sm">Others</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={Math.max(0, 100 - liquidBrandsTotal)}
                    readOnly
                    className="w-28 px-3 py-2 bg-gray-100 cursor-not-allowed border-yellow-200" />
                  <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => addBrand('liquid_brands')} className="w-full border-yellow-300 hover:bg-yellow-100" disabled={(salesData.liquid_brands?.length || 0) >= 5}>
              <Plus className="w-4 h-4 mr-2" />
              Add Liquid Brand
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-200 shadow-sm">
          <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
            <CardTitle className="text-orange-800 text-sm md:text-base font-semibold">Top Substrate Brands by % Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 md:p-6">
            <div className="space-y-2">
              {salesData.substrate_brands?.map((brand, index) =>
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-white rounded-lg border border-orange-200">
                  <Input
                  value={brand.name || ""}
                  onChange={(e) => updateBrandField('substrate_brands', index, 'name', e.target.value)}
                  placeholder="Brand name"
                  className="flex-1 px-3 py-2 border-orange-200" />

                  <div className="flex items-center gap-2">
                    <Input
                    type="number" min="0" max="100"
                    value={brand.percentage ?? ""}
                    onChange={(e) => updateBrandField('substrate_brands', index, 'percentage', e.target.value)}
                    className="w-28 px-3 py-2 border-orange-200"
                    placeholder="0" />
                    <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBrand('substrate_brands', index)} className="text-red-500 hover:bg-red-100 h-9 w-9">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="bg-slate-50 p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-orange-300">
                <Label className="font-semibold text-sm">Others</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={Math.max(0, 100 - substrateBrandsTotal)}
                    readOnly
                    className="w-28 px-3 py-2 bg-gray-100 cursor-not-allowed border-orange-200" />
                  <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => addBrand('substrate_brands')} className="w-full border-orange-300 hover:bg-orange-100" disabled={(salesData.substrate_brands?.length || 0) >= 5}>
              <Plus className="w-4 h-4 mr-2" />
              Add Substrate Brand
            </Button>
          </CardContent>
        </Card>
      </div>
      
      {/* Purchase by Distributor - Bento Box */}
      <Card className="bg-indigo-50/50 border-indigo-200 shadow-sm">
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-indigo-800 text-sm md:text-base">
            <Warehouse className="w-4 h-4" />
            Purchase by Distributor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Purchases from German Distributors</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="0" max="100"
                  value={salesData.german_purchase_percentage ?? ""}
                  onChange={(e) => updateSalesData({ german_purchase_percentage: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 min-w-0 border-indigo-200"
                  placeholder="0" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">Purchases from European Distributors</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={100 - (salesData.german_purchase_percentage || 0)}
                  readOnly
                  className="flex-1 px-3 py-2 min-w-0 bg-gray-100 cursor-not-allowed" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-indigo-200">
            <Label className="text-sm font-semibold">German Distributors:</Label>
            {germanDistributorsTotal > 100 &&
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Total percentage for German distributors cannot exceed 100%.</AlertDescription>
              </Alert>
            }
            {salesData.german_distributors?.map((distributor, index) =>
            <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-white rounded-lg border border-indigo-200">
                <Input
                value={distributor.name || ""}
                onChange={(e) => updateDistributorField('german_distributors', index, 'name', e.target.value)}
                placeholder="Distributor name"
                className="flex-1 px-3 py-2 border-indigo-200" />

                <div className="flex items-center gap-2">
                  <Input
                  type="number" min="0" max="100"
                  value={distributor.percentage ?? ""}
                  onChange={(e) => updateDistributorField('german_distributors', index, 'percentage', e.target.value)}
                  className="w-28 px-3 py-2 border-indigo-200"
                  placeholder="0" />
                  <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeDistributor('german_distributors', index)} className="text-red-500 hover:bg-red-100 h-9 w-9">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 p-3 bg-indigo-100 rounded-lg border border-indigo-300">
              <Label className="font-semibold text-sm">Others</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={Math.max(0, 100 - germanDistributorsTotal)}
                  readOnly
                  className="w-28 px-3 py-2 bg-gray-100 cursor-not-allowed border-indigo-200" />
                <span className="font-medium text-gray-600 text-sm whitespace-nowrap min-w-[24px]">%</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => addDistributor('german_distributors')} className="w-full border-indigo-300 hover:bg-indigo-100" disabled={(salesData.german_distributors?.length || 0) >= 6}>
              <Plus className="w-4 h-4 mr-2" />
              Add German Distributor
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Employee Sizing Breakdown - Separate Card */}
      <Card className="bg-teal-50/50 border-teal-200 shadow-sm">
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-teal-800 text-sm md:text-base">
            <Briefcase className="w-4 h-4" />
            Employee Sizing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="space-y-2">
            <Label className="text-sm md:text-base">Total Employees</Label>
            <Input
              type="number" min="0"
              value={salesData.total_employees ?? ""}
              onChange={(e) => updateSalesData({ total_employees: parseInt(e.target.value) || 0 })}
              className="w-full sm:max-w-[200px] px-3 py-2 border-teal-200 text-sm md:text-base"
              placeholder="0" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap items-end gap-2 sm:gap-3">
            {Object.entries({ s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL', other: 'Other' }).map(([sizeKey, sizeLabel]) =>
            <div key={sizeKey} className="space-y-2 flex-1 min-w-0">
                <Label className="text-xs font-semibold uppercase">{sizeLabel}</Label>
                <Input
                type="number" min="0"
                value={salesData.employee_sizes?.[sizeKey] || 0}
                onChange={(e) => updateEmployeeSize(sizeKey, e.target.value)}
                className="w-full px-2 sm:px-3 py-2 border-teal-200 text-sm md:text-base"
                placeholder="0" />
              </div>
            )}
            <div className="space-y-2 flex-1 min-w-0 col-span-3 sm:col-span-4 md:col-span-1">
              <Label className="text-xs font-semibold uppercase">Remaining</Label>
              <div className="w-full h-9 sm:h-10 px-3 bg-teal-100 rounded-md border border-teal-300 text-center flex items-center justify-center">
                <div className="text-sm sm:text-base font-bold text-teal-800">
                  {Math.max(0, (salesData.total_employees || 0) - totalEmployeesAssigned)}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop Presentation Matrix - Separate Card */}
      <Card className="bg-pink-50/50 border-pink-200 shadow-sm">
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-pink-800 text-sm md:text-base">
            <Store className="w-4 h-4" />
            Shop Presentation Matrix
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm md:text-base">Overall Presentation</Label>
              <StarRating value={salesData.shop_presentation?.overall} onChange={(value) => updateShopPresentation('overall', value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">Instore</Label>
              <StarRating value={salesData.shop_presentation?.instore} onChange={(value) => updateShopPresentation('instore', value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">Branding</Label>
              <StarRating value={salesData.shop_presentation?.branding} onChange={(value) => updateShopPresentation('branding', value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm md:text-base">CANNA</Label>
              <StarRating value={salesData.shop_presentation?.canna} onChange={(value) => updateShopPresentation('canna', value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

}