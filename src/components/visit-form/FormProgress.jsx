import React from 'react';
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";

export default function FormProgress({ sections, currentSection, onSectionClick }) {
  return (
    <Card className="mb-8 p-4">
      <div className="flex items-center justify-between">
        {sections.map((section, index) => (
          <React.Fragment key={index}>
            <motion.div
              className={`flex items-center gap-2 cursor-pointer transition-colors duration-200 ${
                index === currentSection 
                  ? 'text-green-600' 
                  : index < currentSection 
                    ? 'text-green-500' 
                    : 'text-gray-400'
              }`}
              onClick={() => onSectionClick(index)}
              whileHover={{ scale: 1.05 }}
            >
              {index < currentSection ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <Circle className={`w-6 h-6 ${index === currentSection ? 'fill-current' : ''}`} />
              )}
              <span className="font-medium text-sm hidden md:inline">
                {section.title}
              </span>
            </motion.div>
            
            {index < sections.length - 1 && (
              <div className={`flex-1 h-px mx-4 ${
                index < currentSection ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}