import React, { useRef, useState, useEffect } from 'react';
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
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  
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

  // Debug: Log speech recognition state changes
  useEffect(() => {
    console.log('🎤 [Voice-to-Text] State update:', {
      listening,
      hasTranscript: !!transcript,
      transcriptLength: transcript?.length || 0,
      interimTranscriptLength: interimTranscript?.length || 0,
      finalTranscriptLength: finalTranscript?.length || 0,
      browserSupports: browserSupportsSpeechRecognition
    });
  }, [listening, transcript, interimTranscript, finalTranscript, browserSupportsSpeechRecognition]);

  // Save notes before recording starts
  useEffect(() => {
    if (listening && !notesBeforeRecordingRef.current) {
      // Recording just started - save current notes
      console.log('🎤 [Voice-to-Text] Recording started');
      console.log('🎤 [Voice-to-Text] Browser supports speech recognition:', browserSupportsSpeechRecognition);
      console.log('🎤 [Voice-to-Text] Language set to: en-US');
      notesBeforeRecordingRef.current = formData.notes || '';
      lastTranscriptRef.current = '';
    } else if (!listening && notesBeforeRecordingRef.current) {
      // Recording stopped - reset
      console.log('🎤 [Voice-to-Text] Recording stopped');
      notesBeforeRecordingRef.current = '';
      lastTranscriptRef.current = '';
    }
  }, [listening, formData.notes, browserSupportsSpeechRecognition]);

  // Update formData.notes in real-time as user speaks
  useEffect(() => {
    if (listening && transcript && transcript.trim() && transcript !== lastTranscriptRef.current) {
      console.log('🎤 [Voice-to-Text] New transcript received:', transcript);
      console.log('🎤 [Voice-to-Text] Transcript length:', transcript.length);
      console.log('🎤 [Voice-to-Text] Interim transcript:', interimTranscript);
      console.log('🎤 [Voice-to-Text] Final transcript:', finalTranscript);
      
      // Get the base notes (before recording started)
      const baseNotes = notesBeforeRecordingRef.current;
      // Append current transcript
      const newNotes = baseNotes ? `${baseNotes} ${transcript.trim()}` : transcript.trim();
      
      console.log('🎤 [Voice-to-Text] Updating notes with:', newNotes.substring(0, 100) + (newNotes.length > 100 ? '...' : ''));
      updateFormData({ notes: newNotes });
      lastTranscriptRef.current = transcript;
    }
  }, [transcript, listening, updateFormData, interimTranscript, finalTranscript]);

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
    if (listening) {
      console.log('🎤 [Voice-to-Text] Stopping recording...');
      retryCountRef.current = 0; // Reset retry count when manually stopping
      try {
        resetTranscript();
        SpeechRecognition.stopListening();
        console.log('🎤 [Voice-to-Text] Recording stopped successfully');
      } catch (error) {
        console.error('🎤 [Voice-to-Text] Error stopping speech recognition:', error);
        console.error('🎤 [Voice-to-Text] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
    } else {
      console.log('🎤 [Voice-to-Text] Starting voice recording...');
      console.log('🎤 [Voice-to-Text] Browser supports speech recognition:', browserSupportsSpeechRecognition);
      
      // Check if browser supports speech recognition
      if (!browserSupportsSpeechRecognition) {
        console.warn('🎤 [Voice-to-Text] Speech recognition not supported in this browser');
        alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
        return;
      }

      // Check internet connection first
      console.log('🎤 [Voice-to-Text] Checking internet connection...');
      const hasInternet = await checkInternetConnection();
      console.log('🎤 [Voice-to-Text] Internet connection:', hasInternet ? 'Available' : 'Not available');
      
      // Additional check: Try to reach Google's speech recognition service
      if (hasInternet) {
        try {
          console.log('🎤 [Voice-to-Text] Testing connection to speech recognition service...');
          // Try to fetch from a known endpoint to verify connectivity
          const testResponse = await fetch('https://www.google.com', { 
            method: 'HEAD', 
            mode: 'no-cors',
            cache: 'no-cache'
          });
          console.log('🎤 [Voice-to-Text] Network connectivity test completed');
        } catch (testError) {
          console.warn('🎤 [Voice-to-Text] Network test warning:', testError);
        }
      }
      
      if (!hasInternet) {
        alert('No internet connection detected. Speech recognition requires an active internet connection to work. Please check your connection and try again.');
        return;
      }
      
      // Check if we're on HTTPS (required for speech recognition in most browsers)
      const isHTTPS = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isHTTPS && !isLocalhost) {
        console.warn('🎤 [Voice-to-Text] WARNING: Not using HTTPS. Speech recognition may not work on HTTP connections.');
        const proceed = confirm('Speech recognition works best over HTTPS. You are currently on HTTP. Do you want to continue anyway?');
        if (!proceed) {
          return;
        }
      }

      // Try to request microphone permission explicitly (especially important for mobile)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        console.log('🎤 [Voice-to-Text] Requesting microphone permission...');
        const hasPermission = await requestMicrophonePermission();
        console.log('🎤 [Voice-to-Text] Microphone permission:', hasPermission ? 'Granted' : 'Denied');
        if (!hasPermission) {
          console.warn('🎤 [Voice-to-Text] Microphone permission denied, cannot start recording');
          return;
        }
      } else {
        console.warn('🎤 [Voice-to-Text] navigator.mediaDevices.getUserMedia not available');
      }

      try {
        retryCountRef.current = 0; // Reset retry count when starting fresh
        console.log('🎤 [Voice-to-Text] Starting SpeechRecognition with options:', {
          continuous: true,
          interimResults: true,
          language: 'en-US'
        });
        
        // Check if SpeechRecognition is properly initialized
        console.log('🎤 [Voice-to-Text] SpeechRecognition object:', {
          available: !!SpeechRecognition,
          startListening: typeof SpeechRecognition.startListening,
          stopListening: typeof SpeechRecognition.stopListening,
          getRecognition: typeof SpeechRecognition.getRecognition
        });
        
        // Try to get the underlying recognition object for direct event access
        let recognition = null;
        try {
          // Try react-speech-recognition's getRecognition method
          if (SpeechRecognition.getRecognition) {
            recognition = SpeechRecognition.getRecognition();
            console.log('🎤 [Voice-to-Text] Got recognition object via getRecognition():', !!recognition);
          }
          
          // Fallback: Try to access window's SpeechRecognition directly
          if (!recognition) {
            const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognitionAPI) {
              console.log('🎤 [Voice-to-Text] Found native SpeechRecognition API:', {
                SpeechRecognition: !!window.SpeechRecognition,
                webkitSpeechRecognition: !!window.webkitSpeechRecognition
              });
              // Note: We can't create a new instance here as react-speech-recognition manages it
              // But we can check if it's available
            } else {
              console.warn('🎤 [Voice-to-Text] Native SpeechRecognition API not found in window');
            }
          }
          
          if (recognition) {
            console.log('🎤 [Voice-to-Text] Got recognition object:', !!recognition);
            
            // Add event listeners for debugging
            if (recognition) {
              recognition.onstart = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onstart event fired');
              };
              
              recognition.onresult = (event) => {
                console.log('🎤 [Voice-to-Text] Recognition.onresult event fired');
                console.log('🎤 [Voice-to-Text] Result event:', {
                  resultIndex: event.resultIndex,
                  resultsLength: event.results.length,
                  isFinal: event.results[event.resultIndex]?.isFinal,
                  transcript: event.results[event.resultIndex]?.[0]?.transcript
                });
                for (let i = 0; i < event.results.length; i++) {
                  console.log(`🎤 [Voice-to-Text] Result[${i}]:`, {
                    transcript: event.results[i][0].transcript,
                    confidence: event.results[i][0].confidence,
                    isFinal: event.results[i].isFinal
                  });
                }
              };
              
              recognition.onerror = (event) => {
                console.error('🎤 [Voice-to-Text] Recognition.onerror event fired:', {
                  error: event.error,
                  message: event.message,
                  type: event.type
                });
                
                // Handle specific error types
                if (event.error === 'network') {
                  console.error('🎤 [Voice-to-Text] NETWORK ERROR - Speech recognition service cannot be reached');
                  console.error('🎤 [Voice-to-Text] Possible causes:');
                  console.error('  - No internet connection');
                  console.error('  - Firewall/proxy blocking speech recognition API');
                  console.error('  - Speech recognition service is down');
                  console.error('  - Browser blocking the connection');
                  console.error('🎤 [Voice-to-Text] Service URI:', recognition.serviceURI || 'default (browser managed)');
                  
                  // Try to retry if we haven't exceeded max retries
                  if (retryCountRef.current < maxRetries) {
                    retryCountRef.current += 1;
                    console.log(`🎤 [Voice-to-Text] Retrying... (Attempt ${retryCountRef.current}/${maxRetries})`);
                    
                    // Wait a bit before retrying
                    setTimeout(() => {
                      try {
                        console.log('🎤 [Voice-to-Text] Retrying speech recognition...');
                        SpeechRecognition.stopListening();
                        setTimeout(() => {
                          SpeechRecognition.startListening({ 
                            continuous: true, 
                            interimResults: true, 
                            language: 'en-US' 
                          });
                        }, 500);
                      } catch (retryError) {
                        console.error('🎤 [Voice-to-Text] Retry failed:', retryError);
                        alert('Network error: Cannot connect to speech recognition service after multiple attempts. Please check your internet connection and try again later.');
                        retryCountRef.current = 0;
                      }
                    }, 1000 * retryCountRef.current); // Exponential backoff
                  } else {
                    console.error('🎤 [Voice-to-Text] Max retries reached. Giving up.');
                    retryCountRef.current = 0;
                    alert('Network error: Cannot connect to speech recognition service after multiple attempts. Please check your internet connection and try again. If the problem persists, the speech recognition service may be temporarily unavailable.');
                  }
                } else if (event.error === 'no-speech') {
                  console.warn('🎤 [Voice-to-Text] No speech detected - user may not be speaking or microphone may not be picking up audio');
                  retryCountRef.current = 0; // Reset retry count for non-network errors
                } else if (event.error === 'audio-capture') {
                  console.error('🎤 [Voice-to-Text] Audio capture error - microphone may not be working');
                  retryCountRef.current = 0;
                } else if (event.error === 'not-allowed') {
                  console.error('🎤 [Voice-to-Text] Permission denied - microphone access not allowed');
                  retryCountRef.current = 0;
                } else {
                  console.error('🎤 [Voice-to-Text] Unknown error:', event.error);
                  retryCountRef.current = 0;
                }
              };
              
              recognition.onend = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onend event fired');
                // If we're still supposed to be listening but recognition ended due to error,
                // and we haven't exceeded retries, the retry logic in onerror will handle it
                if (listening && retryCountRef.current < maxRetries) {
                  console.log('🎤 [Voice-to-Text] Recognition ended unexpectedly, but retry may be in progress');
                } else if (!listening) {
                  // Normal end - reset retry count
                  retryCountRef.current = 0;
                }
              };
              
              recognition.onaudiostart = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onaudiostart event fired - Audio capture started');
              };
              
              recognition.onaudioend = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onaudioend event fired - Audio capture ended');
              };
              
              recognition.onsoundstart = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onsoundstart event fired - Sound detected');
              };
              
              recognition.onsoundend = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onsoundend event fired - Sound ended');
              };
              
              recognition.onspeechstart = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onspeechstart event fired - Speech detected');
              };
              
              recognition.onspeechend = () => {
                console.log('🎤 [Voice-to-Text] Recognition.onspeechend event fired - Speech ended');
              };
              
              recognition.onnomatch = () => {
                console.warn('🎤 [Voice-to-Text] Recognition.onnomatch event fired - No speech match found');
              };
            }
          }
        } catch (getRecognitionError) {
          console.warn('🎤 [Voice-to-Text] Could not get recognition object:', getRecognitionError);
        }
        
        // Start listening - options are set in the hook configuration
        // Note: Some browsers may require HTTPS for speech recognition to work
        console.log('🎤 [Voice-to-Text] Protocol check:', {
          protocol: window.location.protocol,
          isHTTPS: window.location.protocol === 'https:',
          hostname: window.location.hostname,
          isLocalhost: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        });
        
        SpeechRecognition.startListening({ 
          continuous: true, 
          interimResults: true, 
          language: 'en-US' 
        });
        console.log('🎤 [Voice-to-Text] SpeechRecognition.startListening() called successfully');
        
        // Log recognition state after starting
        setTimeout(() => {
          if (recognition) {
            console.log('🎤 [Voice-to-Text] Recognition state after start:', {
              continuous: recognition.continuous,
              interimResults: recognition.interimResults,
              lang: recognition.lang,
              serviceURI: recognition.serviceURI
            });
          }
        }, 100);
      } catch (error) {
        console.error('🎤 [Voice-to-Text] Error starting speech recognition:', error);
        console.error('🎤 [Voice-to-Text] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code
        });
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
  const isPhotosRequired = true; // Photos are mandatory according to checklist

  return (
    <div className="space-y-6">
      {isPhotosRequired && !hasPhotos && (
        <Alert variant="destructive" className="border-red-300 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Required:</strong> At least one photo must be attached. Please upload photos using the options below.
          </AlertDescription>
        </Alert>
      )}
      <Card className={`bg-gradient-to-br from-blue-50 to-indigo-50 ${isPhotosRequired && !hasPhotos ? 'border-red-300' : 'border-blue-200'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Camera className="w-5 h-5" />
            Visit Photos
            {isPhotosRequired && (
              <span className="text-red-500 font-bold ml-1">*</span>
            )}
            {isPhotosRequired && !hasPhotos && (
              <Badge variant="destructive" className="ml-auto">
                Required - No Photos
              </Badge>
            )}
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
                className={`border-green-300 hover:bg-green-50 ${listening ? 'text-red-600 border-red-300' : ''}`}
              >
                {listening ? (
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
                const newValue = e.target.value;
                // If user is typing, stop listening to avoid conflicts
                if (listening) {
                  console.log('🎤 [Voice-to-Text] User started typing, stopping voice recording');
                  try {
                    SpeechRecognition.stopListening();
                    resetTranscript();
                    console.log('🎤 [Voice-to-Text] Voice recording stopped due to user input');
                  } catch (err) {
                    console.error('🎤 [Voice-to-Text] Error stopping recognition on user input:', err);
                  }
                }
                updateFormData({ notes: newValue });
              }}
              placeholder="Add any additional observations, comments, or important details about this visit..."
              rows={4}
              className="border-green-200 focus:border-green-400"
            />
            {listening && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <span>Recording... {transcript && `(${transcript})`}</span>
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