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
    <div className="space-y-2">
      <div className="text-sm text-muted-foreground">
        Answer generated in {elapsedSeconds}s
      </div>
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
      </div>
      <div className="flex gap-2 pt-2">
        <Badge variant="secondary">{org}</Badge>
        <Badge variant="outline" className="text-xs font-mono">
          {model}
        </Badge>
      </div>
    </div>
  );
}
