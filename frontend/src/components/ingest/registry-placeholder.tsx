"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function RegistryPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Indexed Documents</CardTitle>
        <CardDescription>
          Document registry coming soon. This section will list all uploaded documents with
          their chunk counts and re-index / delete options.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The backend does not yet expose a GET /documents endpoint. To verify your uploads,
          check the Supabase dashboard&apos;s <code className="text-xs bg-muted px-1 py-0.5 rounded">doc_registry</code> table.
        </p>
      </CardContent>
    </Card>
  );
}
