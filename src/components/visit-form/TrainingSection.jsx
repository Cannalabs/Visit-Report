
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
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <GraduationCap className="w-5 h-5" />
            Training & Education
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="training_provided">Training Provided During Visit</Label>
              <p className="text-sm text-gray-600">
                Did you provide any training or education during this visit?
              </p>
            </div>
            <Switch
              id="training_provided"
              checked={formData.training_provided}
              onCheckedChange={(checked) => updateFormData({ training_provided: checked })}
            />
          </div>

          {formData.training_provided && (
            <div className="space-y-4 p-4 bg-white rounded-lg border">
              <Label>Training Topics Covered</Label>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TRAINING_TOPICS.map(topic => (
                  <Button
                    key={topic}
                    variant={formData.training_topics?.includes(topic) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTopic(topic)}
                    className={formData.training_topics?.includes(topic) 
                      ? "bg-blue-600 hover:bg-blue-700" 
                      : "border-blue-200 hover:bg-blue-50"
                    }
                  >
                    {topic}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Add custom training topic..."
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomTopic()}
                />
                <Button
                  onClick={addCustomTopic}
                  disabled={!customTopic}
                  size="icon"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.training_topics?.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Topics:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.training_topics.map(topic => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 flex items-center gap-1"
                      >
                        {topic}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-blue-200"
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
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Support Materials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="support_materials_required">Support Materials Provided?</Label>
              <p className="text-sm text-gray-600">
                Did you leave any brochures, charts, or other materials?
              </p>
            </div>
            <Switch
              id="support_materials_required"
              checked={formData.support_materials_required}
              onCheckedChange={(checked) => updateFormData({ support_materials_required: checked })}
            />
          </div>
          
          {formData.support_materials_required && (
            <div className="space-y-4 p-4 bg-white rounded-lg border">
              <Label>Materials Provided</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {SUPPORT_MATERIALS.map(material => (
                  <Button
                    key={material}
                    variant={formData.support_materials_items?.includes(material) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSupportMaterial(material)}
                    className={formData.support_materials_items?.includes(material) 
                      ? "bg-purple-600 hover:bg-purple-700" 
                      : "border-purple-200 hover:bg-purple-50"
                    }
                  >
                    {material}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom material..."
                  value={customMaterial}
                  onChange={(e) => setCustomMaterial(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomSupportMaterial()}
                />
                <Button
                  onClick={addCustomSupportMaterial}
                  disabled={!customMaterial}
                  size="icon"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.support_materials_items?.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Materials:</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.support_materials_items.map(material => (
                      <Badge
                        key={material}
                        variant="secondary"
                        className="bg-purple-100 text-purple-800 flex items-center gap-1"
                      >
                        {material}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-4 w-4 p-0 hover:bg-purple-200"
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
