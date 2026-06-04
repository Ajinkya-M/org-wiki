"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface QuestionFormProps {
  onSubmit: (question: string) => void;
  isPending: boolean;
}

export function QuestionForm({ onSubmit, isPending }: QuestionFormProps) {
  const [value, setValue] = useState("");

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Textarea
          placeholder="Ask a question about your documents..."
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          className="pr-12 resize-none"
        />
        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
          {value.length}
        </span>
      </div>
      <Button
        onClick={handleSubmit}
        disabled={!value.trim() || isPending}
        className="self-end"
        size="icon"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
