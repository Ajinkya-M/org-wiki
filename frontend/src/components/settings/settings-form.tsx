"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";

export function SettingsForm() {
  const { settings, update } = useSettings();
  const [local, setLocal] = useState(settings);

  function handleSave() {
    update(local);
    toast.success("Settings saved");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="apiBaseUrl">API Base URL</Label>
        <Input
          id="apiBaseUrl"
          value={local.apiBaseUrl}
          onChange={(e) => setLocal({ ...local, apiBaseUrl: e.target.value })}
          placeholder="http://localhost:8000"
        />
        <p className="text-xs text-muted-foreground">
          Restart the dev server after changing this value.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultOrg">Default Org</Label>
        <Input
          id="defaultOrg"
          value={local.defaultOrg}
          onChange={(e) => setLocal({ ...local, defaultOrg: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="topK">Top-K results ({local.topK})</Label>
        <Input
          id="topK"
          type="number"
          min={1}
          max={20}
          value={local.topK}
          onChange={(e) => setLocal({ ...local, topK: Math.min(20, Math.max(1, Number(e.target.value))) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Match threshold ({local.matchThreshold.toFixed(2)})</Label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[local.matchThreshold]}
          onValueChange={([v]) => setLocal({ ...local, matchThreshold: v })}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.0 (low precision)</span>
          <span>1.0 (high precision)</span>
        </div>
      </div>

      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
}
