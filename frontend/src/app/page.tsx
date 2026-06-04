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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QueryResponse, Source } from "@/types/api";

export default function QueryPage() {
  const { org } = useOrg();
  const { settings } = useSettings();
  const mutation = useQueryRag();

  const [history, setHistory] = useState<string[]>(() => loadHistory().map((e) => e.question));
  const [answer, setAnswer] = useState<QueryResponse | null>(null);
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
      }, 1000);

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
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Ask a Question</h1>
        <Badge variant="secondary">{org}</Badge>
      </div>

      <QueryHistory questions={history} onSelect={handleSubmit} />

      <QuestionForm onSubmit={handleSubmit} isPending={mutation.isPending} />

      {mutation.isPending && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="animate-spin text-lg">⟳</span>
              <span className="text-sm">Thinking... {elapsed}s</span>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </CardContent>
        </Card>
      )}

      {mutation.isError && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-sm text-destructive font-medium mb-2">
              {mutation.error.message}
            </p>
            {mutation.error.message.includes("No matches found") && (
              <p className="text-sm text-muted-foreground">
                Try uploading a document first on the{" "}
                <a href="/ingest" className="underline underline-offset-2">
                  Upload page
                </a>
                .
              </p>
            )}
            <button
              onClick={handleRetry}
              className="text-sm text-primary underline underline-offset-2 mt-2"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {answer && !mutation.isPending && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <AnswerCard
                question={answer.question}
                answer={answer.answer}
                model={answer.model}
                org={answer.org}
                elapsedSeconds={elapsed}
              />
            </CardContent>
          </Card>
          <SourcesList sources={answer.sources} />
        </div>
      )}

      {!answer && !mutation.isPending && !mutation.isError && (
        <QueryEmptyState />
      )}
    </div>
  );
}
