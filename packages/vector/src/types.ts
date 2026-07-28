export type VectorPayload = Record<string, unknown>;

export type VectorPoint = {
  id: string;
  embedding: number[];
  payload?: VectorPayload;
};

export type VectorQuery = {
  embedding: number[];
  topK?: number;
  namespace?: string;
  filter?: Record<string, unknown>;
};

export type VectorMatch = {
  id: string;
  score: number;
  payload?: VectorPayload;
};

/**
 * Backend-agnostic vector store port.
 * Swap implementations via VECTOR_BACKEND without changing RAG/agents.
 */
export interface VectorStore {
  readonly name: string;
  upsert(points: VectorPoint[], namespace?: string): Promise<void>;
  query(query: VectorQuery): Promise<VectorMatch[]>;
  delete(ids: string[], namespace?: string): Promise<void>;
}

export const VECTOR_BACKEND_IDS = [
  "memory",
  "postgres",
  "pgvector",
  "qdrant",
  "pinecone",
] as const;

export type VectorBackendId = (typeof VECTOR_BACKEND_IDS)[number];
