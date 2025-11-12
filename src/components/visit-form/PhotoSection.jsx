import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UploadFile } from "@/api/integrations";
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
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function PhotoSection({ formData, updateFormData }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const recognitionRef = useRef(null);
  const networkRetryCountRef = useRef(0); // Track network retry attempts
  const [finalTranscript, setFinalTranscript] = useState(formData.notes || '');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [previewFiles, setPreviewFiles] = useState([]); // Store selected files for preview
  const [previewImage, setPreviewImage] = useState(null); // Store image URL for full preview modal

  // Sync finalTranscript with formData.notes when it changes externally
  useEffect(() => {
    if (formData.notes !== finalTranscript && !isRecording) {
      setFinalTranscript(formData.notes || '');
    }
  }, [formData.notes, finalTranscript, isRecording]);

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
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      setInterimTranscript('');
      networkRetryCountRef.current = 0; // Reset retry counter when stopping
    } else {
      // Reset retry counter when starting new recording
      networkRetryCountRef.current = 0;
      
      // Check internet connection first
      const hasInternet = await checkInternetConnection();
      if (!hasInternet) {
        alert('No internet connection detected. Speech recognition requires an active internet connection to work. Please check your connection and try again.');
        return;
      }

      // Try to request microphone permission explicitly (especially important for mobile)
      // If MediaDevices API is not available, speech recognition will request permission itself
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          return;
        }
      }
      // If MediaDevices API is not available, speech recognition will request permission when started

      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          setInterimTranscript('');
          networkRetryCountRef.current = 0; // Reset retry counter on successful start
        };

        recognition.onresult = (event) => {
          let interimText = '';
          let finalText = formData.notes || '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
              finalText += transcript + ' ';
              setInterimTranscript('');
            } else {
              interimText += transcript;
            }
          }
          
          // Update final transcript if we have final results
          if (finalText !== (formData.notes || '')) {
            setFinalTranscript(finalText.trim());
            updateFormData({ notes: finalText.trim() });
          }
          
          // Show interim results
          if (interimText) {
            setInterimTranscript(interimText);
          }
        };

        recognition.onerror = (event) => {
          setIsRecording(false);
          setInterimTranscript('');
          
          // For network errors, try to restart automatically (max 2 retries)
          if (event.error === 'network') {
            const currentRetryCount = networkRetryCountRef.current;
            networkRetryCountRef.current = currentRetryCount + 1;
            
            if (networkRetryCountRef.current <= 2) {
              // Wait a moment and try to restart
              setTimeout(() => {
                // Check if we're still supposed to retry (user might have stopped)
                if (networkRetryCountRef.current <= 2 && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (restartError) {
                    networkRetryCountRef.current = 0; // Reset counter
                    alert('Network error: Unable to connect to speech recognition service.\n\nThis could be due to:\n- Firewall or network restrictions\n- VPN or proxy settings\n- Browser blocking the connection\n- Service temporarily unavailable\n\nYou can still type your notes manually in the text field below.');
                  }
                }
              }, 2000); // Wait 2 seconds before retry
              return; // Don't show alert on retry attempts
            } else {
              // Max retries reached
              networkRetryCountRef.current = 0; // Reset counter
              alert('Network error: Unable to connect to speech recognition service after multiple attempts.\n\nThis could be due to:\n- Firewall or network restrictions blocking the service\n- VPN or proxy settings interfering\n- Browser blocking the connection\n- Service temporarily unavailable\n\nYou can still type your notes manually in the text field below.');
            }
          } else {
            // Reset retry counter for non-network errors
            networkRetryCountRef.current = 0;
          }
          
          // Show user-friendly error messages for other errors
          let errorMessage = 'Speech recognition error occurred.';
          switch(event.error) {
            case 'no-speech':
              errorMessage = 'No speech detected. Please try again.';
              break;
            case 'audio-capture':
              errorMessage = 'Microphone not found or access denied. Please check your microphone permissions.';
              break;
            case 'not-allowed':
              errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
              break;
            case 'service-not-allowed':
              errorMessage = 'Speech recognition service is not available. Please try again later.';
              break;
            case 'bad-grammar':
              errorMessage = 'Speech recognition grammar error. Please try again.';
              break;
            case 'language-not-supported':
              errorMessage = 'Language not supported. Please use English.';
              break;
            case 'aborted':
              // User stopped, don't show error
              return;
            default:
              errorMessage = `Speech recognition error: ${event.error}. Please try again or type your notes manually.`;
          }
          
          // Only show alert for non-user-initiated errors
          if (event.error !== 'aborted') {
            alert(errorMessage);
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          setInterimTranscript('');
        };

        try {
          recognition.start();
        } catch (error) {
          alert('Failed to start voice recording. Please try again.');
          setIsRecording(false);
        }
      } else {
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
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

          {/* Preview Section - Show selected files immediately */}
          <AnimatePresence>
            {previewFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label className="text-blue-700 font-semibold">
                  Selected Photos ({previewFiles.length})
                  {isUploading && <span className="text-blue-500 ml-2">• Uploading...</span>}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                          className="w-full h-24 object-cover rounded-lg border shadow-sm group-hover:shadow-md transition-shadow"
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
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
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
              value={(formData.notes || '') + (interimTranscript ? ' ' + interimTranscript : '')}
              onChange={(e) => {
                const newValue = e.target.value;
                // Remove interim transcript if user is typing
                const cleanValue = interimTranscript ? newValue.replace(interimTranscript, '').trim() : newValue;
                setFinalTranscript(cleanValue);
                setInterimTranscript('');
                updateFormData({ notes: cleanValue });
              }}
              placeholder="Add any additional observations, comments, or important details about this visit..."
              rows={4}
              className="border-green-200 focus:border-green-400"
            />
            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <span>Recording... {interimTranscript && `(${interimTranscript})`}</span>
              </div>
            )}
            <p className="text-xs text-green-600">
              💡 Use voice input for quick note-taking while on-site. Voice input will be processed and added to your notes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Full Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95">
          {previewImage && (() => {
            // Combine all photos (uploaded + preview) for navigation
            const allPhotos = [...(formData.visit_photos || []), ...previewFiles.map(p => p.preview)];
            const currentIndex = allPhotos.indexOf(previewImage);
            const totalPhotos = allPhotos.length;
            const hasMultiple = totalPhotos > 1;

            return (
              <div className="relative">
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
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}