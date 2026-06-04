"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface QuestionFormProps {
  onSubmit: (question: string) => void;
  isPending: boolean;
}

const SUGGESTIONS = [
  "What is the leave policy for new joiners?",
  "How do I submit an expense report?",
  "What's the remote work policy?",
];

export function QuestionForm({ onSubmit, isPending }: QuestionFormProps) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  function autosize() {
    const el = taRef.current; if (!el) return;
    el.style.height = "auto"; el.style.height = Math.max(56, el.scrollHeight) + "px";
  }
  useEffect(autosize, [value]);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="query-box">
      <textarea
        ref={taRef}
        className="query-input"
        value={value}
        placeholder="Ask a question about your documents…"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <div className="query-foot">
        <div className="suggest-row">
          {SUGGESTIONS.slice(0, 2).map((s) => (
            <button key={s} className="chip" onClick={() => { setValue(s); taRef.current && taRef.current.focus(); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" />
              </svg>
              <span>{s}</span>
            </button>
          ))}
        </div>
        <span className="kbd">⌘ + ↵</span>
        <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!value.trim() || isPending}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 3L5 13h5l-1 8 8-10h-5z" />
          </svg>
          <span>Ask</span>
        </button>
      </div>
    </div>
  );
}
