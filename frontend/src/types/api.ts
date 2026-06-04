export interface HealthResponse {
  status: string;
}

export interface QueryRequest {
  question: string;
  org?: string;
  top_k?: number;
  match_threshold?: number;
}

export interface Source {
  source: string;
  chunk_id: string;
  doc_id: string;
  similarity: number;
}

export interface QueryResponse {
  org: string;
  model: string;
  question: string;
  answer: string;
  sources: Source[];
}

export interface IngestResult {
  doc_id: string;
  status: string;
  chunk_count: number;
  chunks_indexed?: number;
  file_name?: string;
  reason?: string;
}

export interface IngestResponse {
  org: string;
  file_name: string;
  result: IngestResult;
}
