"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, X } from "lucide-react";

interface ImageUploaderProps {
  label: string;
  onImageSelected: (file: File | null) => void;
  selectedFile?: File | null;
}

export function ImageUploader({ label, onImageSelected, selectedFile }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setBlobUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [selectedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImageSelected(e.target.files[0]);
    }
  };

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (ALLOWED_TYPES.includes(file.type)) {
        onImageSelected(file);
      }
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div
        className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
          isDragOver ? "border-accent bg-accent/10" : "border-surface-border bg-surface hover:bg-surface-hover"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileChange}
        />
        
        {selectedFile && blobUrl ? (
          <div className="relative w-full h-full p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={blobUrl} 
              alt="Preview" 
              className="w-full h-full object-cover rounded-lg"
            />
            <button 
              onClick={clearImage}
              aria-label="Remove selected image"
              className="absolute top-4 right-4 p-1 bg-black/60 text-white rounded-full hover:bg-black/90 transition"
            >
              <X size={16} />
            </button>          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <UploadCloud className="w-8 h-8 mb-2 text-zinc-400" />
            <p className="text-sm text-foreground font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-zinc-500 mt-1">JPG, PNG up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );
}
