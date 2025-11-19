import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Save } from 'lucide-react';

export default function SignaturePad({ onSave, signerName, onError }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const context = canvas.getContext('2d');
    context.scale(1, 1);
    context.lineCap = 'round';
    context.strokeStyle = 'black';
    context.lineWidth = 2;
    contextRef.current = context;
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    if (!contextRef.current) return;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    isDrawing.current = true;
  };

  const finishDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    isDrawing.current = false;
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing.current || !contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const hasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.some(channel => channel !== 0);
  };

  const saveSignature = () => {
    // Validate signer name before saving
    if (!signerName || signerName.trim() === "") {
      const errorMsg = "Signer name is mandatory. Please enter the name before submitting.";
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    // Check if signature was drawn
    if (!hasSignature()) {
      const errorMsg = "Please draw a signature before confirming.";
      if (onError) {
        onError(errorMsg);
      }
      return;
    }

    const dataUrl = canvasRef.current.toDataURL();
    const result = onSave(dataUrl);
    
    // If onSave returns false, it means validation failed
    if (result === false) {
      return;
    }
  };

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        onTouchStart={startDrawing}
        onTouchEnd={finishDrawing}
        onTouchMove={draw}
        className="border border-gray-300 rounded-lg w-full h-48 bg-gray-50 cursor-crosshair"
      />
      <div className="flex gap-4">
        <Button variant="outline" onClick={clearCanvas}>
          <Eraser className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button onClick={saveSignature} className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}