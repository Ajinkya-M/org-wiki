"use client";

import { useState } from "react";
import { useHealth } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export function TestConnectionButton() {
  const [triggered, setTriggered] = useState(false);
  const { data, error, isFetching, refetch } = useHealth();

  function handleTest() {
    setTriggered(true);
    refetch();
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={handleTest} disabled={isFetching}>
        {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Test Connection
      </Button>

      {triggered && !isFetching && (
        <div className="flex items-center gap-2">
          {data?.status === "ok" ? (
            <>
              <Badge variant="default" className="bg-green-600">Connected</Badge>
              <span className="text-sm text-muted-foreground">Backend is reachable</span>
            </>
          ) : error ? (
            <>
              <Badge variant="destructive">Error</Badge>
              <span className="text-sm text-destructive">{error.message}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
