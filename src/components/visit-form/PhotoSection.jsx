import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UploadFile } from "@/api/integrations";
import { 
  Camera, 
  Upload, 
  X, 
  Image as ImageIcon,
  FileText,
  Mic,
  MicOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PhotoSection({ formData, updateFormData }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const recognitionRef = useRef(null);
  const [finalTranscript, setFinalTranscript] = useState(formData.notes || '');

  const handleFileUpload = async (files) => {
    if (!files.length) return;
    
    setIsUploading(true);
    const uploadPromises = Array.from(files).map(async (file) => {
      try {
        const { file_url } = await UploadFile({ file });
        return file_url;
      } catch (error) {
        console.error("Error uploading file:", error);
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter(url => url !== null);
    
    updateFormData({
      visit_photos: [...(formData.visit_photos || []), ...validUrls]
    });
    
    setIsUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removePhoto = (urlToRemove) => {
    updateFormData({
      visit_photos: formData.visit_photos.filter(url => url !== urlToRemove)
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalText = finalTranscript;
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
              setFinalTranscript(finalText);
              updateFormData({ notes: finalText });
            } else {
              interimTranscript += transcript;
            }
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.start();
      } else {
        alert('Speech recognition not supported in this browser');
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Camera className="w-5 h-5" />
            Visit Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />

          {/* Drag and Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-100' 
                : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="flex flex-col items-center gap-4">
              <ImageIcon className="w-12 h-12 text-blue-400" />
              <div>
                <p className="text-lg font-medium text-blue-800 mb-2">
                  Drag & Drop Images Here
                </p>
                <p className="text-sm text-blue-600 mb-4">
                  Or use the buttons below to take a photo or select files
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={triggerCameraInput}
                    disabled={isUploading}
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                  <Button
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Files
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {isUploading && (
            <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Uploading photos...</span>
            </div>
          )}

          <AnimatePresence>
            {formData.visit_photos?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label>Uploaded Photos ({formData.visit_photos.length})</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {formData.visit_photos.map((url, index) => (
                    <motion.div
                      key={url}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <img
                        src={url}
                        alt={`Visit photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        onClick={() => removePhoto(url)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-green-800">
            <FileText className="w-5 h-5" />
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Label htmlFor="notes">Visit Notes</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleVoiceRecording}
                className={`border-green-300 hover:bg-green-50 ${isRecording ? 'text-red-600 border-red-300' : ''}`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Stop Recording
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Voice Input
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => {
                setFinalTranscript(e.target.value);
                updateFormData({ notes: e.target.value });
              }}
              placeholder="Add any additional observations, comments, or important details about this visit..."
              rows={4}
              className="border-green-200 focus:border-green-400"
            />
            <p className="text-xs text-green-600">
              💡 Use voice input for quick note-taking while on-site. Voice input will be processed and added to your notes.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}