"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceItem } from "@/components/query/source-item";
import type { Source } from "@/types/api";

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  const [expanded, setExpanded] = useState(true);

  if (sources.length === 0) return null;

  return (
    <div className="border rounded-lg">
      <Button
        variant="ghost"
        className="flex w-full items-center justify-between px-4 py-2 h-auto"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm font-medium">
          Sources ({sources.length})
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {sources.map((source, i) => (
            <SourceItem key={i} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}
