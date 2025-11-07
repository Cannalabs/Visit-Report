import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import SignaturePad from "./SignaturePad";
import { Badge } from "@/components/ui/badge";
import { Edit, Check } from "lucide-react";

export default function SignatureSection({ formData, updateFormData }) {
  const [signerName, setSignerName] = useState(formData.signature_signer_name || "");
  const [isSigned, setIsSigned] = useState(!!formData.signature);

  const handleSaveSignature = (signatureDataUrl) => {
    updateFormData({
      signature: signatureDataUrl,
      signature_signer_name: signerName,
      signature_date: new Date().toISOString()
    });
    setIsSigned(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Edit className="w-5 h-5" />
            E-Signature
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="signer_name">Shop Representative's Name</Label>
            <Input
              id="signer_name"
              placeholder="Enter full name of the person signing"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={isSigned}
            />
          </div>
          
          {isSigned ? (
            <div className="p-4 border border-green-200 bg-green-50 rounded-lg text-center">
                <Badge className="bg-green-100 text-green-800">
                    <Check className="w-4 h-4 mr-2"/>
                    Signature Captured
                </Badge>
                 <img src={formData.signature} alt="signature" className="mx-auto mt-4 border rounded"/>
            </div>
          ) : (
            <SignaturePad onSave={handleSaveSignature} />
          )}

        </CardContent>
      </Card>
    </div>
  );
}