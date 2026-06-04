"use client";

import { useState, useRef, useCallback } from "react";
import { useOrg } from "@/lib/org-context";
import { useSettings } from "@/hooks/use-settings";
import { useQueryRag } from "@/hooks/use-api";
import { loadHistory, pushHistory } from "@/lib/query-history";
import { QuestionForm } from "@/components/query/question-form";
import { AnswerCard } from "@/components/query/answer-card";
import { SourcesList } from "@/components/query/sources-list";
import { QueryHistory } from "@/components/query/query-history";
import { QueryEmptyState } from "@/components/query/query-empty-state";

export default function QueryPage() {
  const { org } = useOrg();
  const { settings } = useSettings();
  const mutation = useQueryRag();

  const [history, setHistory] = useState<string[]>(() => loadHistory().map((e) => e.question));
  const [answer, setAnswer] = useState<{ question: string; answer: string; model: string; org: string; sources: { source: string; chunk_id: string; doc_id: string; similarity: number }[] } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  const handleSubmit = useCallback(
    (question: string) => {
      if (timerRef.current) clearInterval(timerRef.current);

      startRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 100);

      setAnswer(null);

      mutation.mutate(
        {
          question,
          org,
          top_k: settings.topK,
          match_threshold: settings.matchThreshold,
        },
        {
          onSuccess: (data) => {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
            setAnswer(data);
            const qs = pushHistory(question).map((e) => e.question);
            setHistory(qs);
          },
          onError: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
          },
        }
      );
    },
    [org, settings.topK, settings.matchThreshold, mutation]
  );

  function handleRetry() {
    if (mutation.variables) {
      handleSubmit(mutation.variables.question);
    }
  }

  return (
    <div className="ask-stage">
      <div className="page-head">
        <div className="eyebrow" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--accent-strong)" }}>
            <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
            <path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
          </svg>
          Ask
        </div>
        <h1 className="t-h1" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.25, display: "flex", alignItems: "center", gap: 11 }}>Org Wiki knowledge base</h1>
        <p style={{ margin: "8px 0 0", color: "var(--text-2)", fontSize: 14, maxWidth: "56ch" }}>Ask anything about your indexed documents. Answers are grounded in source chunks with similarity scores.</p>
      </div>

      <QuestionForm onSubmit={handleSubmit} isPending={mutation.isPending} />

      <QueryHistory questions={history} onSelect={handleSubmit} />

      {mutation.isPending && (
        <div className="loading-bar">
          <span className="loading-dots"><i /><i /><i /></span>
          <span style={{ fontSize: 14, color: "var(--text-2)" }}>Searching documents and generating answer</span>
          <span className="loading-timer">{elapsed}s</span>
        </div>
      )}

      {mutation.isError && (
        <div className="card" style={{ borderColor: "color-mix(in oklch, var(--red-400) 40%, transparent)" }}>
          <div style={{ padding: 24 }}>
            <p style={{ fontSize: 14, color: "var(--badge-red-fg)", fontWeight: 500, marginBottom: 8 }}>
              {mutation.error.message}
            </p>
            {mutation.error.message.includes("No matches found") && (
              <p style={{ fontSize: 13, color: "var(--text-3)", margin: 0 }}>
                Try uploading a document first on the{" "}
                <a href="/ingest" style={{ color: "var(--accent-strong)", textDecoration: "underline", textUnderlineOffset: 2 }}>Upload page</a>.
              </p>
            )}
            <button onClick={handleRetry} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
              Retry
            </button>
          </div>
        </div>
      )}

      {answer && !mutation.isPending && (
        <div className="card answer-card" style={{ padding: 24 }}>
          <AnswerCard
            question={answer.question}
            answer={answer.answer}
            model={answer.model}
            org={answer.org}
            elapsedSeconds={elapsed}
          />
          <SourcesList sources={answer.sources} />
          <div className="answer-actions">
            <button className="btn btn-secondary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L10 8" />
                <path d="M15 10a3.5 3.5 0 0 0-5 0l-2.5 2.5a3.5 3.5 0 0 0 5 5L14 16" />
              </svg>
              <span>Copy answer</span>
            </button>
            <button className="btn btn-ghost btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" />
                <path d="M18.5 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
              </svg>
              <span>Ask another</span>
            </button>
          </div>
        </div>
      )}

      {!answer && !mutation.isPending && !mutation.isError && (
        <QueryEmptyState />
      )}
    </div>
  );
}
