"use client";

import type { Source } from "@/types/api";

interface SourceItemProps {
  source: Source;
}

export function SourceItem({ source }: SourceItemProps) {
  const score = Math.round(source.similarity * 100);

  return (
    <div className="source-row">
      <span className="score">{score}%</span>
      <span className="score-bar"><i style={{ width: score + "%" }} /></span>
      <span className="source-meta">
        <span className="source-name">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5" />
            <path d="M9 13h6" /><path d="M9 16.5h4" />
          </svg>
          {source.source}
        </span>
        <span className="source-path">{source.doc_id}/{source.chunk_id}</span>
      </span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
        <path d="M8 6.5L6 12v5.5h5V12H8z" /><path d="M18 6.5L16 12v5.5h5V12h-3z" />
      </svg>
    </div>
  );
}
