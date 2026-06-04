"use client";

import { SourceItem } from "@/components/query/source-item";
import type { Source } from "@/types/api";

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (sources.length === 0) return null;

  return (
    <>
      <div className="sources-divider" />
      <div className="sources-label" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>Sources</div>
      <div className="source-list">
        {sources.map((source, i) => (
          <SourceItem key={i} source={source} />
        ))}
      </div>
    </>
  );
}
