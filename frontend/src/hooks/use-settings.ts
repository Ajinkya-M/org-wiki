"use client";

import { useState, useEffect, useCallback } from "react";
import { loadSettings, saveSettings, type Settings } from "@/lib/settings-storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const update = useCallback((partial: Partial<Settings>) => {
    const updated = saveSettings(partial);
    setSettings(updated);
  }, []);

  return { settings, update };
}
