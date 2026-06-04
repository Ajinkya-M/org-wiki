"use client";

import { Badge } from "@/components/ui/badge";

interface QueryHistoryProps {
  questions: string[];
  onSelect: (q: string) => void;
}

export function QueryHistory({ questions, onSelect }: QueryHistoryProps) {
  if (questions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q, i) => (
        <button key={i} onClick={() => onSelect(q)}>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent transition-colors text-xs max-w-[200px] truncate"
          >
            {q}
          </Badge>
        </button>
      ))}
    </div>
  );
}
