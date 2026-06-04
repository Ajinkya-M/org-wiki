"use client";

import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import type { QueryRequest, QueryResponse, IngestResponse, HealthResponse } from "@/types/api";

async function apiHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Health check failed (${res.status})`);
  }
  return res.json();
}

async function apiQuery(body: QueryRequest): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Query failed (${res.status})`);
  }
  return res.json();
}

async function apiIngest(formData: FormData): Promise<IngestResponse> {
  const res = await fetch("/api/ingest", {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Ingest failed (${res.status})`);
  }
  return res.json();
}

export function useHealth() {
  return useQuery<HealthResponse, Error>({
    queryKey: ["health"],
    queryFn: apiHealth,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useQueryRag() {
  return useMutation<QueryResponse, Error, QueryRequest>({
    mutationFn: apiQuery,
    retry: 0,
  });
}

export function useIngest() {
  return useMutation<IngestResponse, Error, FormData>({
    mutationFn: apiIngest,
    retry: 0,
  });
}
