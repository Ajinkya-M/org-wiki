"use client";

interface QueryHistoryProps {
  questions: string[];
  onSelect: (q: string) => void;
}

export function QueryHistory({ questions, onSelect }: QueryHistoryProps) {
  if (questions.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
      {questions.map((q, i) => (
        <button
          key={i}
          className="chip"
          onClick={() => onSelect(q)}
          style={{ maxWidth: 260 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />
          </svg>
          <span>{q}</span>
        </button>
      ))}
    </div>
  );
}
