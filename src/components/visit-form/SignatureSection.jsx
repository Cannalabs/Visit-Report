import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SignaturePad from "./SignaturePad";
import { Badge } from "@/components/ui/badge";
import { Edit, Check, AlertCircle } from "lucide-react";

export default function SignatureSection({ formData, updateFormData }) {
  const [signerName, setSignerName] = useState(formData.signature_signer_name || "");
  const [isSigned, setIsSigned] = useState(!!formData.signature);
  const [signatureError, setSignatureError] = useState("");

  // Sync with formData when it changes (e.g., when loading existing visit)
  useEffect(() => {
    if (formData.signature_signer_name !== undefined) {
      setSignerName(formData.signature_signer_name || "");
    }
    setIsSigned(!!formData.signature);
  }, [formData.signature, formData.signature_signer_name]);

  const handleSaveSignature = (signatureDataUrl) => {
    // Validate signer name before saving signature
    if (!signerName || signerName.trim() === "") {
      setSignatureError("Signer name is mandatory. Please enter the name before submitting.");
      return false; // Prevent saving
    }

    setSignatureError("");
    updateFormData({
      signature: signatureDataUrl,
      signature_signer_name: signerName.trim(),
      signature_date: new Date().toISOString()
    });
    setIsSigned(true);
    return true; // Success
  };

  const handleEditSignature = () => {
    setIsSigned(false);
    setSignatureError("");
    // Clear signature data to allow re-signing
    updateFormData({
      signature: null,
      signature_signer_name: signerName, // Keep the name
      signature_date: null
    });
  };

  // Check if signature is required (mandatory field)
  const hasSignature = !!formData.signature && !!formData.signature_signer_name && !!formData.signature_date;
  const isSignatureRequired = true; // Signature is mandatory according to checklist
  const missingSignatureFields = [];
  if (!formData.signature) missingSignatureFields.push('Signature');
  if (!formData.signature_signer_name) missingSignatureFields.push('Signer Name');

  return (
    <div className="space-y-4 md:space-y-6">
      {isSignatureRequired && !hasSignature && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <AlertDescription className="text-red-800 text-sm md:text-base">
            <strong>Required fields missing:</strong> {missingSignatureFields.join(', ')}. Please provide both signature and signer name to complete this section.
          </AlertDescription>
        </Alert>
      )}
      <Card className={`bg-gradient-to-br from-gray-50 to-gray-100 ${isSignatureRequired && !hasSignature ? 'border-red-300' : 'border-gray-200'}`}>
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-gray-800 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Edit className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>E-Signature</span>
              {isSignatureRequired && (
                <span className="text-red-500 font-bold">*</span>
              )}
            </div>
            {isSignatureRequired && !hasSignature && (
              <Badge variant="destructive" className="self-start sm:ml-auto">
                Required - Incomplete
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="space-y-2">
            <Label htmlFor="signer_name" className="text-sm md:text-base">Shop Representative's Name *</Label>
            <Input
              id="signer_name"
              placeholder="Enter full name"
              value={signerName}
              onChange={(e) => {
                setSignerName(e.target.value);
                setSignatureError(""); // Clear error when user types
              }}
              className={`text-sm md:text-base ${signatureError || (isSignatureRequired && !signerName.trim()) ? "border-red-300 bg-red-50" : ""}`}
              required
            />
            {!signerName.trim() && isSignatureRequired && (
              <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                This field is required
              </p>
            )}
            {signatureError && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <AlertDescription className="text-sm">{signatureError}</AlertDescription>
              </Alert>
            )}
          </div>
          
          {isSigned ? (
            <div className="space-y-4">
              <div className="p-3 md:p-4 border border-green-200 bg-green-50 rounded-lg text-center">
                <Badge className="bg-green-100 text-green-800 text-xs md:text-sm">
                  <Check className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 flex-shrink-0"/>
                  Signature Captured
                </Badge>
                <img src={formData.signature} alt="signature" className="mx-auto mt-3 md:mt-4 border rounded max-w-full h-auto"/>
              </div>
              <Button 
                variant="outline" 
                onClick={handleEditSignature}
                className="w-full text-sm md:text-base"
              >
                <Edit className="w-4 h-4 mr-2 flex-shrink-0" />
                Edit Signature
              </Button>
            </div>
          ) : (
            <SignaturePad 
              onSave={handleSaveSignature} 
              signerName={signerName}
              onError={(error) => setSignatureError(error)}
            />
          )}

        </CardContent>
      </Card>
    </div>
  );
}