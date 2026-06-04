"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { TestConnectionButton } from "@/components/settings/test-connection-button";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
          <CardDescription>
            These settings are saved to localStorage and used by the query and upload pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Connection</CardTitle>
          <CardDescription>
            Verify that the FastAPI backend is reachable from the Next.js API proxy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestConnectionButton />
        </CardContent>
      </Card>
    </div>
  );
}
