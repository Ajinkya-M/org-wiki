"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";

interface AnswerCardProps {
  question: string;
  answer: string;
  model: string;
  org: string;
  elapsedSeconds: number;
}

export function AnswerCard({ question, answer, model, org, elapsedSeconds }: AnswerCardProps) {
  return (
    <div>
      <div className="answer-head">
        <span className="badge" style={{ background: "var(--badge-purple-bg)", color: "var(--badge-purple-fg)" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 3L5 13h5l-1 8 8-10h-5z" />
          </svg>
          Answer
        </span>
        <span className="mono-tag">{model}</span>
      </div>
      <div className="answer-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
      </div>
    </div>
  );
}
