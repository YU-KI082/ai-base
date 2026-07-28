import type { VectorBackendId, VectorStore } from "./types.js";
import { InMemoryVectorStore } from "./memory.js";
import { PgVectorStore, PostgresVectorStore } from "./postgres.js";
import { QdrantVectorStore } from "./qdrant.js";
import { PineconeVectorStore } from "./pinecone.js";

export type VectorStoreFactory = () => VectorStore;

const registry = new Map<VectorBackendId, VectorStoreFactory>([
  ["memory", () => new InMemoryVectorStore()],
  ["postgres", () => new PostgresVectorStore()],
  ["pgvector", () => new PgVectorStore()],
  ["qdrant", () => new QdrantVectorStore()],
  ["pinecone", () => new PineconeVectorStore()],
]);

export function registerVectorStore(
  id: VectorBackendId,
  factory: VectorStoreFactory,
): void {
  registry.set(id, factory);
}

export function listVectorBackends(): VectorBackendId[] {
  return [...registry.keys()];
}

export function createVectorStore(
  backend = process.env.VECTOR_BACKEND ?? "postgres",
): VectorStore {
  const id = backend.toLowerCase() as VectorBackendId;
  const factory = registry.get(id);
  if (!factory) {
    throw new Error(
      `Unknown VECTOR_BACKEND "${backend}". Supported: ${[...registry.keys()].join(", ")}`,
    );
  }
  return factory();
}
