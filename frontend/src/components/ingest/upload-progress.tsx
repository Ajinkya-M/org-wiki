"use client";

import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import type { StagedFile } from "@/components/ingest/file-list";

interface UploadProgressProps {
  file: StagedFile;
}

export function UploadProgress({ file }: UploadProgressProps) {
  switch (file.status) {
    case "queued":
      return <Clock className="h-5 w-5 text-muted-foreground shrink-0" />;
    case "uploading":
      return <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />;
    case "indexed":
      return (
        <div className="flex items-center gap-1 shrink-0">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="text-xs text-green-600">{file.result?.chunk_count} chunks</span>
        </div>
      );
    case "error":
      return (
        <div className="flex items-center gap-1 shrink-0">
          <XCircle className="h-5 w-5 text-destructive" />
          <span className="text-xs text-destructive">{file.error}</span>
        </div>
      );
  }
}
