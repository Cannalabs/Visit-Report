
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GraduationCap, BookOpen, Plus, X } from "lucide-react";
import { Checkbox } from '@/components/ui/checkbox';

const TRAINING_TOPICS = [
  "Product Knowledge",
  "Nutrient Schedules",
  "Growing Techniques",
  "Problem Diagnosis",
  "Customer Service",
  "Sales Techniques",
  "New Products",
  "Seasonal Advice"
];

const SUPPORT_MATERIALS = [
  "CANNA Promo Products",
  "CANNA Brochures",
  "CANNA Merchandise",
  "Growth Charts",
  "Product Samples"
];

export default function TrainingSection({ formData, updateFormData }) {
  const [customTopic, setCustomTopic] = React.useState("");
  const [customMaterial, setCustomMaterial] = React.useState("");

  const toggleTopic = (topic) => {
    const topics = formData.training_topics || [];
    if (topics.includes(topic)) {
      updateFormData({
        training_topics: topics.filter(t => t !== topic)
      });
    } else {
      updateFormData({
        training_topics: [...topics, topic]
      });
    }
  };

  const addCustomTopic = () => {
    if (customTopic && !(formData.training_topics || []).includes(customTopic)) {
      updateFormData({
        training_topics: [...(formData.training_topics || []), customTopic]
      });
      setCustomTopic("");
    }
  };

  const removeTopic = (topic) => {
    updateFormData({
      training_topics: (formData.training_topics || []).filter(t => t !== topic)
    });
  };
  
  const toggleSupportMaterial = (material) => {
    const materials = formData.support_materials_items || [];
    if (materials.includes(material)) {
      updateFormData({
        support_materials_items: materials.filter(m => m !== material)
      });
    } else {
      updateFormData({
        support_materials_items: [...materials, material]
      });
    }
  };

  const addCustomSupportMaterial = () => {
    if (customMaterial && !(formData.support_materials_items || []).includes(customMaterial)) {
      updateFormData({
        support_materials_items: [...(formData.support_materials_items || []), customMaterial]
      });
      setCustomMaterial("");
    }
  };

  const removeSupportMaterial = (material) => {
    updateFormData({
      support_materials_items: (formData.support_materials_items || []).filter(m => m !== material)
    });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-blue-800 text-sm md:text-base">
            <GraduationCap className="w-4 h-4 md:w-5 md:h-5" />
            Training & Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <Label htmlFor="training_provided" className="text-sm md:text-base">Training Provided During Visit</Label>
              <p className="text-xs md:text-sm text-gray-600">
                Did you provide any training or education during this visit?
              </p>
            </div>
            <Switch
              id="training_provided"
              checked={formData.training_provided}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateFormData({ training_provided: true });
                } else {
                  // Clear all training data when toggle is off
                  updateFormData({ 
                    training_provided: false,
                    training_topics: []
                  });
                  setCustomTopic("");
                }
              }}
              className="flex-shrink-0"
            />
          </div>

          {formData.training_provided && (
            <div className="space-y-3 md:space-y-4 p-3 md:p-4 bg-white rounded-lg border">
              <Label className="text-sm md:text-base">Training Topics Covered</Label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {TRAINING_TOPICS.map(topic => (
                  <Button
                    key={topic}
                    variant={formData.training_topics?.includes(topic) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTopic(topic)}
                    className={`text-xs md:text-sm ${formData.training_topics?.includes(topic) 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-blue-200 hover:bg-blue-50"
                    }`}
                  >
                    <span className="truncate">{topic}</span>
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom training topic..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="flex-1 min-w-0 text-sm md:text-base"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
                />
                <Button
                  onClick={addCustomTopic}
                  disabled={!customTopic}
                  size="icon"
                  variant="outline"
                  className="flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.training_topics?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">Selected Topics:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.training_topics.map(topic => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 flex items-center gap-1 text-xs md:text-sm"
                      >
                        <span className="truncate max-w-[120px] md:max-w-none">{topic}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-blue-200 flex-shrink-0"
                          onClick={() => removeTopic(topic)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            Support Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <Label htmlFor="support_materials_required" className="text-sm md:text-base">Support Materials Provided?</Label>
              <p className="text-xs md:text-sm text-gray-600">
                Did you leave any brochures, charts, or other materials?
              </p>
            </div>
            <Switch
              id="support_materials_required"
              checked={formData.support_materials_required}
              onCheckedChange={(checked) => {
                if (checked) {
                  updateFormData({ support_materials_required: true });
                } else {
                  // Clear all support materials data when toggle is off
                  updateFormData({ 
                    support_materials_required: false,
                    support_materials_items: [],
                    support_materials_other_text: ""
                  });
                  setCustomMaterial("");
                }
              }}
              className="flex-shrink-0"
            />
          </div>
          
          {formData.support_materials_required && (
            <div className="space-y-3 md:space-y-4 p-3 md:p-4 bg-white rounded-lg border">
              <Label className="text-sm md:text-base">Materials Provided</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {SUPPORT_MATERIALS.map(material => (
                  <Button
                    key={material}
                    variant={formData.support_materials_items?.includes(material) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSupportMaterial(material)}
                    className={`text-xs md:text-sm ${formData.support_materials_items?.includes(material) 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : "border-purple-200 hover:bg-purple-50"
                    }`}
                  >
                    <span className="truncate">{material}</span>
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom material..."
                  value={customMaterial}
                  onChange={(e) => setCustomMaterial(e.target.value)}
                  className="flex-1 min-w-0 text-sm md:text-base"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSupportMaterial()}
                />
                <Button
                  onClick={addCustomSupportMaterial}
                  disabled={!customMaterial}
                  size="icon"
                  variant="outline"
                  className="flex-shrink-0 h-9 w-9 md:h-10 md:w-10"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.support_materials_items?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm md:text-base">Selected Materials:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.support_materials_items.map(material => (
                      <Badge
                        key={material}
                        variant="secondary"
                        className="bg-purple-100 text-purple-800 flex items-center gap-1 text-xs md:text-sm"
                      >
                        <span className="truncate max-w-[120px] md:max-w-none">{material}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-purple-200 flex-shrink-0"
                          onClick={() => removeSupportMaterial(material)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
