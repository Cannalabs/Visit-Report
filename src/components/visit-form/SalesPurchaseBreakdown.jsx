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
    <div className="flex items-center space-x-1">
      {[...Array(5)].map((_, index) => {
        const ratingValue = index + 1;
        return (
          <button type="button" key={ratingValue} onClick={() => onChange(valueMap[ratingValue])} className="focus:outline-none">
            <Star
              className={`w-6 h-6 transition-all duration-200 ${
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <TrendingUp className="w-5 h-5" />
              Sales Liquids
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="organic_percentage">Organic {renderRequiredAsterisk()}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="organic_percentage"
                  type="number" min="0" max="100"
                  value={salesData.organic_percentage}
                  onChange={(e) => updateSalesData({ organic_percentage: parseFloat(e.target.value) || 0 })}
                  className={getFieldStyle(salesData.organic_percentage, true)}
                  placeholder="0" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mineral (Auto-calculated)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={100 - (salesData.organic_percentage || 0)}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50/50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <DollarSign className="w-5 h-5" />
              Purchase Value
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="estimated_canna_value">Estimated Total (K€) {renderRequiredAsterisk()}</Label>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-600">€</span>
                <Input
                  id="estimated_canna_value"
                  type="number" min="0" step="0.1"
                  value={salesData.estimated_canna_value}
                  onChange={(e) => updateSalesData({ estimated_canna_value: parseFloat(e.target.value) || 0 })}
                  className={getFieldStyle(salesData.estimated_canna_value, true)}
                  placeholder="0.0" />

                <span className="font-medium text-gray-600">K€</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="liquids_percentage">CANNA Liquids {renderRequiredAsterisk()}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="liquids_percentage"
                  type="number" min="0" max="100"
                  value={salesData.liquids_percentage}
                  onChange={(e) => updateSalesData({ liquids_percentage: parseFloat(e.target.value) || 0 })}
                  className={getFieldStyle(salesData.liquids_percentage, true)}
                  placeholder="0" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>CANNA Substrates</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={100 - (salesData.liquids_percentage || 0)}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-purple-50/50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <TrendingDown className="w-5 h-5" />
            Sales Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 bg-white rounded-lg border border-purple-200">
            <Label className="font-semibold">Liquids Trend</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select value={salesData.liquids_trend} onValueChange={(value) => updateSalesData({ liquids_trend: value })}>
                  <SelectTrigger className="border-purple-200">
                    <SelectValue placeholder="Select trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increasing">Increasing</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="decreasing">Decreasing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={salesData.liquids_trend_percentage}
                  onChange={(e) => updateSalesData({ liquids_trend_percentage: parseFloat(e.target.value) || 0 })}
                  className="border-purple-200"
                  placeholder="0" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-4 bg-white rounded-lg border border-purple-200">
            <Label className="font-semibold">Substrates Trend</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Select value={salesData.substrates_trend} onValueChange={(value) => updateSalesData({ substrates_trend: value })}>
                  <SelectTrigger className="border-purple-200">
                    <SelectValue placeholder="Select trend" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increasing">Increasing</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                    <SelectItem value="decreasing">Decreasing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={salesData.substrates_trend_percentage}
                  onChange={(e) => updateSalesData({ substrates_trend_percentage: parseFloat(e.target.value) || 0 })}
                  className="border-purple-200"
                  placeholder="0" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-yellow-50/50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800 text-xl font-semibold leading-none tracking-tight">Top Liquid Brands       % Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {salesData.liquid_brands?.map((brand, index) =>
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-white rounded-lg border border-yellow-200">
                  <Input
                  value={brand.name}
                  onChange={(e) => updateBrandField('liquid_brands', index, 'name', e.target.value)}
                  placeholder="Brand name"
                  className="flex-1 border-yellow-200" />

                  <div className="flex items-center gap-1">
                    <Input
                    type="number" min="0" max="100"
                    value={brand.percentage}
                    onChange={(e) => updateBrandField('liquid_brands', index, 'percentage', e.target.value)}
                    className="w-24 border-yellow-200"
                    placeholder="0" />

                    <span className="font-medium text-gray-600 min-w-[20px]">%</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBrand('liquid_brands', index)} className="text-red-500 hover:bg-red-100">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                <Label className="font-semibold">Others</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={Math.max(0, 100 - liquidBrandsTotal)}
                    readOnly
                    className="w-24 bg-gray-100 cursor-not-allowed border-yellow-200" />

                  <span className="font-medium text-gray-600 min-w-[20px]">%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => addBrand('liquid_brands')} className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border bg-background hover:text-accent-foreground h-10 px-4 py-2 border-yellow-300 hover:bg-yellow-100" disabled={(salesData.liquid_brands?.length || 0) >= 5}>
              <Plus className="w-4 h-4 mr-2" />
              Add Liquid Brand
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-orange-50/50 border-orange-200">
          <CardHeader>
            <CardTitle className="text-2xl text-xl font-semibold leading-none tracking-tight">Top Substrate Brands by % Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {salesData.substrate_brands?.map((brand, index) =>
              <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] items-center gap-2 p-3 bg-white rounded-lg border border-orange-200">
                  <Input
                  value={brand.name}
                  onChange={(e) => updateBrandField('substrate_brands', index, 'name', e.target.value)}
                  placeholder="Brand name"
                  className="flex-1 border-orange-200" />

                  <div className="flex items-center gap-1">
                    <Input
                    type="number" min="0" max="100"
                    value={brand.percentage}
                    onChange={(e) => updateBrandField('substrate_brands', index, 'percentage', e.target.value)}
                    className="w-24 border-orange-200"
                    placeholder="0" />

                    <span className="font-medium text-gray-600 min-w-[20px]">%</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeBrand('substrate_brands', index)} className="text-red-500 hover:bg-red-100">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <div className="bg-slate-50 p-3 grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-orange-300">
                <Label className="font-semibold">Others</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={Math.max(0, 100 - substrateBrandsTotal)}
                    readOnly
                    className="w-24 bg-gray-100 cursor-not-allowed border-orange-200" />

                  <span className="font-medium text-gray-600 min-w-[20px]">%</span>
                </div>
              </div>
            </div>
            <Button variant="outline" onClick={() => addBrand('substrate_brands')} className="border-orange-300 hover:bg-orange-100" disabled={(salesData.substrate_brands?.length || 0) >= 5}>
              <Plus className="w-4 h-4 mr-2" />
              Add Substrate Brand
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-indigo-50/50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            <Warehouse className="w-5 h-5" />
            Purchase by Distributor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Purchases from German Distributors</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number" min="0" max="100"
                  value={salesData.german_purchase_percentage}
                  onChange={(e) => updateSalesData({ german_purchase_percentage: parseFloat(e.target.value) || 0 })}
                  className="border-indigo-200"
                  placeholder="0" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchases from European Distributors</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={100 - (salesData.german_purchase_percentage || 0)}
                  readOnly
                  className="bg-gray-100 cursor-not-allowed" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
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
                value={distributor.name}
                onChange={(e) => updateDistributorField('german_distributors', index, 'name', e.target.value)}
                placeholder="Distributor name"
                className="flex-1 border-indigo-200" />

                <div className="flex items-center gap-1">
                  <Input
                  type="number" min="0" max="100"
                  value={distributor.percentage}
                  onChange={(e) => updateDistributorField('german_distributors', index, 'percentage', e.target.value)}
                  className="w-24 border-indigo-200"
                  placeholder="0" />

                  <span className="font-medium text-gray-600 min-w-[20px]">%</span>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeDistributor('german_distributors', index)} className="text-red-500 hover:bg-red-100">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-2 p-3 bg-indigo-100 rounded-lg border border-indigo-300">
              <Label className="font-semibold">Others</Label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={Math.max(0, 100 - germanDistributorsTotal)}
                  readOnly
                  className="w-24 bg-gray-100 cursor-not-allowed border-indigo-200" />

                <span className="font-medium text-gray-600 min-w-[20px]">%</span>
              </div>
            </div>
            <Button variant="outline" onClick={() => addDistributor('german_distributors')} className="border-indigo-300 hover:bg-indigo-100" disabled={(salesData.german_distributors?.length || 0) >= 6}>
              <Plus className="w-4 h-4 mr-2" />
              Add German Distributor
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-teal-50/50 border-teal-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-teal-800">
            <Briefcase className="w-5 h-5" />
            Employee Sizing Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Total Employees</Label>
            <Input
              type="number" min="0"
              value={salesData.total_employees}
              onChange={(e) => updateSalesData({ total_employees: parseInt(e.target.value) || 0 })}
              className="w-32 border-teal-200"
              placeholder="0" />

          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries({ s: 'S', m: 'M', l: 'L', xl: 'XL', xxl: 'XXL', other: 'Other' }).map(([sizeKey, sizeLabel]) =>
            <div key={sizeKey} className="space-y-2">
                <Label className="text-sm font-semibold uppercase">{sizeLabel}</Label>
                <Input
                type="number" min="0"
                value={salesData.employee_sizes?.[sizeKey] || 0}
                onChange={(e) => updateEmployeeSize(sizeKey, e.target.value)}
                className="w-full border-teal-200"
                placeholder="0" />

              </div>
            )}
          </div>
          <div className="p-3 bg-teal-100 rounded-lg border border-teal-300 flex justify-between items-center">
            <Label className="font-semibold">Remaining (Unassigned)</Label>
            <div className="text-lg font-bold text-teal-800">
              {Math.max(0, (salesData.total_employees || 0) - totalEmployeesAssigned)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-pink-50/50 border-pink-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-pink-800">
            <Store className="w-5 h-5" />
            Shop Presentation Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Overall Presentation</Label>
              <StarRating value={salesData.shop_presentation?.overall} onChange={(value) => updateShopPresentation('overall', value)} />
            </div>
            <div className="space-y-2">
              <Label>Instore</Label>
              <StarRating value={salesData.shop_presentation?.instore} onChange={(value) => updateShopPresentation('instore', value)} />
            </div>
            <div className="space-y-2">
              <Label>Branding</Label>
              <StarRating value={salesData.shop_presentation?.branding} onChange={(value) => updateShopPresentation('branding', value)} />
            </div>
            <div className="space-y-2">
              <Label>CANNA</Label>
              <StarRating value={salesData.shop_presentation?.canna} onChange={(value) => updateShopPresentation('canna', value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);

}