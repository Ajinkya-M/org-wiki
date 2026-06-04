"use client";

import { Badge } from "@/components/ui/badge";
import { formatSimilarity } from "@/lib/format";
import type { Source } from "@/types/api";

interface SourceItemProps {
  source: Source;
}

export function SourceItem({ source }: SourceItemProps) {
  return (
    <div className="flex flex-col gap-1 rounded border p-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate flex-1" title={source.source}>
          {source.source}
        </span>
        <Badge variant="secondary" className="text-xs shrink-0">
          {formatSimilarity(source.similarity)}
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono truncate" title={source.chunk_id}>
          {source.chunk_id}
        </span>
        <span className="truncate" title={source.doc_id}>
          {source.doc_id}
        </span>
      </div>
    </div>
  );
}
