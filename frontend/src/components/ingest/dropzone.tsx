"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFiles, disabled }: DropzoneProps) {
  const onDrop = useCallback(
    <T extends File>(
      accepted: T[],
      rejected: import("react-dropzone").FileRejection[]
    ) => {
      if (rejected.length > 0) {
        rejected.forEach(({ file, errors }) => {
          toast.error(`"${file.name}": ${errors[0]?.message || "Invalid file"}`);
        });
      }
      if (accepted.length > 0) {
        onFiles(accepted);
      }
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    maxSize: 50 * 1024 * 1024,
    disabled,
    validator: (file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return { code: "not-pdf", message: "Only PDF files are supported." };
      }
      return null;
    },
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      {isDragActive ? (
        <p className="text-sm font-medium">Drop PDFs here...</p>
      ) : (
        <div>
          <p className="text-sm font-medium">Drag & drop PDFs here, or click to select</p>
          <p className="text-xs text-muted-foreground mt-1">PDF only, up to 50 MB each</p>
        </div>
      )}
    </div>
  );
}
