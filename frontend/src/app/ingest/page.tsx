"use client";

import { useState, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dropzone } from "@/components/ingest/dropzone";
import { FileList, type StagedFile } from "@/components/ingest/file-list";
import { RegistryPlaceholder } from "@/components/ingest/registry-placeholder";
import { useIngest } from "@/hooks/use-api";
import { useHealth } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

let fileIdCounter = 0;
function nextId(): string {
  fileIdCounter += 1;
  return `file-${fileIdCounter}-${Date.now()}`;
}

export default function IngestPage() {
  const { org, setOrg } = useOrg();
  const { data: health } = useHealth();
  const ingestMutation = useIngest();

  const [currentOrg, setCurrentOrg] = useState(org);
  const [staged, setStaged] = useState<StagedFile[]>([]);

  const handleAddFiles = useCallback((files: File[]) => {
    setStaged((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: nextId(),
        file,
        status: "queued" as const,
      })),
    ]);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setStaged((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    const toUpload = staged.filter((f) => f.status === "queued");
    if (toUpload.length === 0) return;

    const results: { success: number; fail: number } = { success: 0, fail: 0 };

    for (const stagedFile of toUpload) {
      setStaged((prev) =>
        prev.map((f) => (f.id === stagedFile.id ? { ...f, status: "uploading" as const } : f))
      );

      const formData = new FormData();
      formData.append("file", stagedFile.file);
      formData.append("org", currentOrg);

      try {
        const response = await ingestMutation.mutateAsync(formData);
        setStaged((prev) =>
          prev.map((f) =>
            f.id === stagedFile.id
              ? {
                  ...f,
                  status: "indexed" as const,
                  result: response.result,
                }
              : f
          )
        );
        results.success += 1;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setStaged((prev) =>
          prev.map((f) =>
            f.id === stagedFile.id
              ? { ...f, status: "error" as const, error: message }
              : f
          )
        );
        results.fail += 1;
      }
    }

    toast(
      `Upload complete: ${results.success} indexed, ${results.fail} failed`
    );
  }, [staged, currentOrg, ingestMutation]);

  const queuedCount = staged.filter((f) => f.status === "queued").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Upload Documents</h1>
        {health?.status === "ok" ? (
          <Badge variant="default" className="bg-green-600">Backend Online</Badge>
        ) : (
          <Badge variant="destructive">Backend Offline</Badge>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ingest-org">Organisation</Label>
        <Input
          id="ingest-org"
          value={currentOrg}
          onChange={(e) => {
            setCurrentOrg(e.target.value);
            setOrg(e.target.value);
          }}
        />
      </div>

      <Dropzone onFiles={handleAddFiles} disabled={ingestMutation.isPending} />

      <FileList files={staged} onRemove={handleRemove} />

      {queuedCount > 0 && (
        <Button onClick={handleUpload} disabled={ingestMutation.isPending} className="w-full">
          {ingestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Upload {queuedCount} file{queuedCount > 1 ? "s" : ""}
        </Button>
      )}

      <RegistryPlaceholder />
    </div>
  );
}
