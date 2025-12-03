import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { UploadFile } from "@/api/integrations";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { 
  Camera, 
  Upload, 
  X, 
  Image as ImageIcon,
  FileText,
  Mic,
  MicOff,
  CheckCircle,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PhotoSection({ formData, updateFormData }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewFiles, setPreviewFiles] = useState([]); // Store selected files for preview
  const [previewImage, setPreviewImage] = useState(null); // Store image URL for full preview modal
  const [isManuallyStopped, setIsManuallyStopped] = useState(false); // Track manual stop to force UI update
  
  // React Speech Recognition hook
  // Note: Hook must be called unconditionally (React rules)
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language: 'en-US'
  });

  // Track the notes before recording started and last transcript
  const notesBeforeRecordingRef = useRef('');
  const lastTranscriptRef = useRef('');

  // Save notes before recording starts
  useEffect(() => {
    if (listening && !notesBeforeRecordingRef.current) {
      // Recording just started - save current notes
      notesBeforeRecordingRef.current = formData.notes || '';
      lastTranscriptRef.current = '';
      setIsManuallyStopped(false); // Reset manual stop flag when recording starts
    } else if (!listening && notesBeforeRecordingRef.current) {
      // Recording stopped - reset
      notesBeforeRecordingRef.current = '';
      lastTranscriptRef.current = '';
      setIsManuallyStopped(false); // Reset manual stop flag
    }
  }, [listening, formData.notes]);

  // Update formData.notes in real-time as user speaks
  useEffect(() => {
    if (listening && !isManuallyStopped && transcript && transcript.trim() && transcript !== lastTranscriptRef.current) {
      // Get the base notes (before recording started)
      const baseNotes = notesBeforeRecordingRef.current;
      // Append current transcript
      const newNotes = baseNotes ? `${baseNotes} ${transcript.trim()}` : transcript.trim();
      
      updateFormData({ notes: newNotes });
      lastTranscriptRef.current = transcript;
    }
  }, [transcript, listening, isManuallyStopped, updateFormData]);

  // Keyboard navigation for preview modal
  useEffect(() => {
    if (!previewImage) return;

    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        const allPhotos = [...(formData.visit_photos || []), ...previewFiles.map(p => p.preview)];
        const currentIndex = allPhotos.indexOf(previewImage);
        if (currentIndex > 0) {
          setPreviewImage(allPhotos[currentIndex - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const allPhotos = [...(formData.visit_photos || []), ...previewFiles.map(p => p.preview)];
        const currentIndex = allPhotos.indexOf(previewImage);
        if (currentIndex < allPhotos.length - 1) {
          setPreviewImage(allPhotos[currentIndex + 1]);
        }
      } else if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [previewImage, formData.visit_photos, previewFiles]);

  const handleFileSelect = (files) => {
    if (!files.length) return;
    
    const fileArray = Array.from(files);
    
    // Create preview URLs for immediate display
    const previewItems = fileArray.map(file => {
      const previewUrl = URL.createObjectURL(file);
      return {
        file: file,
        preview: previewUrl,
        name: file.name,
        size: file.size,
        uploading: false,
        uploaded: false
      };
    });
    
    // Add to preview list
    setPreviewFiles(prev => [...prev, ...previewItems]);
    
    // Auto-upload immediately
    handleFileUpload(fileArray, previewItems);
  };

  const handleFileUpload = async (files, previewItems) => {
    if (!files.length) return;
    
    setIsUploading(true);
    
    // Mark preview items as uploading
    setPreviewFiles(prev => prev.map(item => {
      const matchingItem = previewItems.find(p => p.file === item.file);
      return matchingItem ? { ...item, uploading: true } : item;
    }));
    
    const uploadPromises = files.map(async (file, index) => {
      try {
        // Call UploadFile with the file object directly (not wrapped in an object)
        const result = await UploadFile(file);
        // Handle different possible response structures
        const fileUrl = result?.file_url || result?.url || (typeof result === 'string' ? result : null);
        // Ensure it's a string
        if (typeof fileUrl === 'string' && fileUrl.trim().length > 0) {
          // Mark as uploaded in preview
          setPreviewFiles(prev => prev.map(item => {
            if (item.file === file) {
              // Clean up the preview URL
              URL.revokeObjectURL(item.preview);
              return { ...item, uploaded: true, preview: fileUrl, uploading: false };
            }
            return item;
          }));
          return fileUrl;
        }
        return null;
      } catch (error) {
        // Mark as failed
        setPreviewFiles(prev => prev.map(item => {
          if (item.file === file) {
            URL.revokeObjectURL(item.preview);
            return { ...item, uploading: false, uploaded: false, error: true };
          }
          return item;
        }));
        return null;
      }
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    // Filter out null, undefined, and ensure all are strings
    const validUrls = uploadedUrls.filter(url => 
      url !== null && url !== undefined && typeof url === 'string' && url.trim().length > 0
    );
    
    if (validUrls.length > 0) {
      // Add to form data - ensure we're updating the existing array properly
      const currentPhotos = formData.visit_photos || [];
      const newPhotos = [...currentPhotos, ...validUrls];
      
      updateFormData({
        visit_photos: newPhotos
      });
    }
    
    // Remove uploaded items from preview after a short delay
    setTimeout(() => {
      setPreviewFiles(prev => prev.filter(item => !item.uploaded || validUrls.includes(item.preview)));
    }, 1000);
    
    setIsUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleFileSelect(files);
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
    // Also remove from preview if it exists
    setPreviewFiles(prev => {
      const updated = prev.filter(item => item.preview !== urlToRemove);
      // Clean up revoked URLs
      prev.forEach(item => {
        if (item.preview === urlToRemove && item.preview.startsWith('blob:')) {
          URL.revokeObjectURL(item.preview);
        }
      });
      return updated;
    });
  };

  const removePreview = (previewItem) => {
    // Clean up the preview URL
    if (previewItem.preview.startsWith('blob:')) {
      URL.revokeObjectURL(previewItem.preview);
    }
    setPreviewFiles(prev => prev.filter(item => item !== previewItem));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  const checkInternetConnection = async () => {
    try {
      // Try to fetch a small resource to check internet connectivity
      const response = await fetch('https://www.google.com/favicon.ico', { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch (error) {
      // Try alternative check
      try {
        await fetch('https://www.cloudflare.com/favicon.ico', { 
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        });
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  const requestMicrophonePermission = async () => {
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // Try legacy API as fallback
      const getUserMedia = navigator.getUserMedia || 
                          navigator.webkitGetUserMedia || 
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia;
      
      if (!getUserMedia) {
        alert('Microphone access is not supported in this browser. Please use a modern browser like Chrome, Edge, or Safari.');
        return false;
      }

      // Use legacy API with Promise wrapper
      return new Promise((resolve) => {
        getUserMedia.call(
          navigator,
          { audio: true },
          (stream) => {
            // Stop the stream immediately - we just needed permission
            stream.getTracks().forEach(track => track.stop());
            resolve(true);
          },
          (error) => {
            let errorMessage = 'Failed to access microphone.';
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
              const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              if (isMobile) {
                errorMessage = 'Microphone permission denied.\n\nTo enable:\n1. Tap the lock icon in your browser\'s address bar\n2. Select "Site Settings"\n3. Allow microphone access\n4. Refresh the page and try again';
              } else {
                errorMessage = 'Microphone permission denied.\n\nTo enable:\n1. Click the lock icon in your browser\'s address bar\n2. Select "Site Settings" or "Permissions"\n3. Allow microphone access\n4. Refresh the page and try again';
              }
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
              errorMessage = 'No microphone found. Please connect a microphone and try again.';
            }
            alert(errorMessage);
            resolve(false);
          }
        );
      });
    }

    try {
      // Request microphone permission explicitly using modern API
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        let errorMessage;
        if (isMobile) {
          errorMessage = 'Microphone permission denied.\n\nTo enable:\n1. Tap the lock icon in your browser\'s address bar\n2. Select "Site Settings"\n3. Allow microphone access\n4. Refresh the page and try again';
        } else {
          errorMessage = 'Microphone permission denied.\n\nTo enable:\n1. Click the lock icon in your browser\'s address bar\n2. Select "Site Settings" or "Permissions"\n3. Allow microphone access\n4. Refresh the page and try again';
        }
        alert(errorMessage);
        return false;
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
        return false;
      } else {
        alert('Failed to access microphone. Please check your browser settings.');
        return false;
      }
    }
  };

  const toggleVoiceRecording = async () => {
    if (listening || isManuallyStopped) {
      // Set manual stop flag immediately to update UI
      setIsManuallyStopped(true);
      
      try {
        // Try multiple methods to ensure recording stops
        // Method 1: Use stopListening (standard method)
        SpeechRecognition.stopListening();
        
        // Method 2: Get underlying recognition instance and stop it directly
        try {
          if (SpeechRecognition.getRecognition) {
            const recognition = SpeechRecognition.getRecognition();
            if (recognition) {
              if (recognition.stop) {
                recognition.stop();
              }
              // Also try abort as a more forceful stop
              if (recognition.abort) {
                recognition.abort();
              }
            }
          }
        } catch (recognitionError) {
          // If getRecognition fails, that's okay, we already called stopListening
        }
        
        // Reset transcript and clear state
        resetTranscript();
        lastTranscriptRef.current = '';
      } catch (error) {
        // If all methods fail, try to get recognition instance directly
        try {
          if (SpeechRecognition.getRecognition) {
            const recognition = SpeechRecognition.getRecognition();
            if (recognition && recognition.abort) {
              recognition.abort();
            }
          }
        } catch (finalError) {
          console.error('Error stopping speech recognition:', finalError);
          // Last resort: try stopListening again
          try {
            SpeechRecognition.stopListening();
          } catch (e) {
            // If everything fails, at least reset the transcript
            resetTranscript();
          }
        }
      }
    } else {
      // Check if browser supports speech recognition
      if (!browserSupportsSpeechRecognition) {
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      // Check internet connection first
      const hasInternet = await checkInternetConnection();
      
      if (!hasInternet) {
        alert('No internet connection detected. Speech recognition requires an active internet connection to work. Please check your connection and try again.');
        return;
      }
      
      // Check if we're on HTTPS (required for speech recognition in most browsers)
      const isHTTPS = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isHTTPS && !isLocalhost) {
        const proceed = confirm('Speech recognition works best over HTTPS. You are currently on HTTP. Do you want to continue anyway?');
        if (!proceed) {
          return;
        }
      }

      // Try to request microphone permission explicitly (especially important for mobile)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return;
        }
      }

      try {
        SpeechRecognition.startListening({ 
          continuous: true, 
          interimResults: true, 
          language: 'en-US' 
        });
      } catch (error) {
        let errorMessage = 'Failed to start voice recording. ';
        if (error.message) {
          errorMessage += error.message;
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          errorMessage += 'Microphone permission denied. Please allow microphone access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else {
          errorMessage += 'Please check your microphone permissions and try again.';
        }
        alert(errorMessage);
      }
    }
  };

  // Check if photos are required (mandatory field)
  const hasPhotos = formData.visit_photos && formData.visit_photos.length > 0;
  const isPhotosRequired = false; // Photos are optional

  // Compute dialog content using useMemo to avoid React reconciliation issues
  const dialogContent = useMemo(() => {
    if (!previewImage) return null;
    
    // Combine all photos (uploaded + preview) for navigation
    const allPhotos = [...(formData.visit_photos || []), ...previewFiles.map(p => p.preview)];
    const currentIndex = allPhotos.indexOf(previewImage);
    const totalPhotos = allPhotos.length;
    const hasMultiple = totalPhotos > 1;

    return (
      <div className="relative" key={previewImage}>
        <img
          src={previewImage}
          alt="Preview"
          className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <Button
          size="sm"
          variant="destructive"
          className="absolute top-4 right-4 w-8 h-8 rounded-full p-0 shadow-lg z-10"
          onClick={() => setPreviewImage(null)}
        >
          <X className="w-4 h-4" />
        </Button>
        {/* Navigation buttons if multiple photos */}
        {hasMultiple && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full p-0 bg-black/50 hover:bg-black/70 border-white/30 text-white"
              onClick={(e) => {
                e.stopPropagation();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : totalPhotos - 1;
                setPreviewImage(allPhotos[prevIndex]);
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full p-0 bg-black/50 hover:bg-black/70 border-white/30 text-white"
              onClick={(e) => {
                e.stopPropagation();
                const nextIndex = currentIndex < totalPhotos - 1 ? currentIndex + 1 : 0;
                setPreviewImage(allPhotos[nextIndex]);
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </>
        )}
        {/* Photo counter */}
        {hasMultiple && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {totalPhotos}
          </div>
        )}
      </div>
    );
  }, [previewImage, formData.visit_photos, previewFiles]);

  return (
    <div className="space-y-4 md:space-y-6">
      {isPhotosRequired && !hasPhotos && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <AlertDescription className="text-red-800 text-sm md:text-base">
            <strong>Required:</strong> At least one photo must be attached. Please upload photos using the options below.
          </AlertDescription>
        </Alert>
      )}
      <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 ${isPhotosRequired && !hasPhotos ? 'border-red-300' : 'border-blue-200'}`}>
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-blue-800 text-sm md:text-base">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>Visit Photos</span>
              {isPhotosRequired && (
                <span className="text-red-500 font-bold">*</span>
              )}
            </div>
            {isPhotosRequired && !hasPhotos && (
              <Badge variant="destructive" className="self-start sm:ml-auto">
                Required - No Photos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
              }
              // Reset input so same file can be selected again
              e.target.value = '';
            }}
            className="hidden"
          />
          
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
              }
              // Reset input so same file can be selected again
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Drag and Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-100' 
                : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            <div className="flex flex-col items-center gap-3 md:gap-4">
              <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 flex-shrink-0" />
              <div className="w-full">
                <p className="text-base sm:text-lg font-medium text-blue-800 mb-2">
                  Drag & Drop Images Here
                </p>
                <p className="text-xs sm:text-sm text-blue-600 mb-3 sm:mb-4">
                  Or use the buttons below to take a photo or select files
                </p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <Button
                    onClick={triggerCameraInput}
                    disabled={isUploading}
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50 w-full sm:w-auto text-sm md:text-base"
                  >
                    <Camera className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Take Photo</span>
                    <span className="sm:hidden">Take Photo</span>
                  </Button>
                  <Button
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50 w-full sm:w-auto text-sm md:text-base"
                  >
                    <Upload className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Choose Files</span>
                    <span className="sm:hidden">Choose Files</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section - Show selected files immediately */}
          <AnimatePresence>
            {previewFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label className="text-blue-700 font-semibold text-sm md:text-base">
                  Selected Photos ({previewFiles.length})
                  {isUploading && <span className="text-blue-500 ml-2 text-xs md:text-sm">• Uploading...</span>}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  {previewFiles.map((previewItem, index) => (
                    <motion.div
                      key={`preview-${index}-${previewItem.name}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative group"
                    >
                      <div className="relative cursor-pointer" onClick={() => setPreviewImage(previewItem.preview)}>
                        <img
                          src={previewItem.preview}
                          alt={`Preview ${previewItem.name}`}
                          className="w-full h-20 sm:h-24 object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        {/* Preview icon overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                          <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* Upload status overlay */}
                        {previewItem.uploading && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-50 rounded-lg flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {previewItem.uploaded && (
                          <div className="absolute inset-0 bg-green-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {previewItem.error && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 rounded-lg flex items-center justify-center">
                            <X className="w-6 h-6 text-white" />
                          </div>
                        )}
                        {/* Remove button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-6 sm:h-6 rounded-full p-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-lg z-10"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent opening preview
                            if (previewItem.uploaded) {
                              removePhoto(previewItem.preview);
                            } else {
                              removePreview(previewItem);
                            }
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate" title={previewItem.name}>
                        {previewItem.name}
                        {previewItem.uploaded && (
                          <span className="ml-2 text-green-600">✓ Uploaded</span>
                        )}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isUploading && previewFiles.length === 0 && (
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
                      className="relative group cursor-pointer"
                      onClick={() => setPreviewImage(url)}
                    >
                      <img
                        src={url}
                        alt={`Visit photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow"
                        onError={(e) => {
                          // If image fails to load (e.g., old example.com URL), hide it
                          e.target.style.display = 'none';
                        }}
                      />
                      {/* Preview icon overlay */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {/* Remove button */}
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent opening preview
                          removePhoto(url);
                        }}
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
        <CardHeader className="pb-3 px-4 md:px-6 pt-4 md:pt-6">
          <CardTitle className="flex items-center gap-2 text-green-800 text-sm md:text-base">
            <FileText className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
              <Label htmlFor="notes" className="text-sm md:text-base">Visit Notes</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={toggleVoiceRecording}
                className={`border-green-300 hover:bg-green-50 text-xs sm:text-sm ${(listening && !isManuallyStopped) ? 'text-red-600 border-red-300' : ''} w-full sm:w-auto`}
              >
                {(listening && !isManuallyStopped) ? (
                  <>
                    <MicOff className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 sm:mr-2 flex-shrink-0" />
                    <span>Start Voice Input</span>
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => {
                const newValue = e.target.value;
                // If user is typing, stop listening to avoid conflicts
                if (listening && !isManuallyStopped) {
                  setIsManuallyStopped(true);
                  try {
                    SpeechRecognition.stopListening();
                    // Also try to get recognition instance and stop it
                    try {
                      if (SpeechRecognition.getRecognition) {
                        const recognition = SpeechRecognition.getRecognition();
                        if (recognition) {
                          if (recognition.stop) {
                            recognition.stop();
                          }
                          if (recognition.abort) {
                            recognition.abort();
                          }
                        }
                      }
                    } catch (recognitionError) {
                      // Ignore if getRecognition fails
                    }
                    resetTranscript();
                    lastTranscriptRef.current = '';
                  } catch (err) {
                    // Silently handle errors when stopping
                  }
                }
                updateFormData({ notes: newValue });
              }}
              placeholder="Add any additional observations, comments, or important details about this visit..."
              rows={4}
              className="border-green-200 focus:border-green-400 text-sm md:text-base resize-none"
            />
            <p className="text-xs sm:text-sm text-green-600">
              💡 Use voice input for quick note-taking while on-site. Voice input will be processed and added to your notes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Full Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95">
          {dialogContent}
        </DialogContent>
      </Dialog>
    </div>
  );
}