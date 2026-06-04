"use client";

import { MessageSquare } from "lucide-react";

export function QueryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-1">Ask a question</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Type a question above to search your organisation&apos;s documents. Answers include
        cited sources so you can verify the information.
      </p>
    </div>
  );
}
