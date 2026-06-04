"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadProgress } from "@/components/ingest/upload-progress";
import { formatBytes } from "@/lib/format";

export interface StagedFile {
  id: string;
  file: File;
  status: "queued" | "uploading" | "indexed" | "error";
  error?: string;
  result?: { doc_id: string; chunk_count: number };
}

interface FileListProps {
  files: StagedFile[];
  onRemove: (id: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Files to upload ({files.length})</h3>
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded border px-3 py-2 text-sm"
        >
          <UploadProgress file={f} />
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium">{f.file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(f.file.size)}</p>
          </div>
          {(f.status === "queued" || f.status === "error") && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onRemove(f.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
