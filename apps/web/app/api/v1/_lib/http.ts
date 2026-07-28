import { NextResponse } from "next/server";
import type { z } from "zod";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export async function readJsonSchema<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const body: unknown = await request.json();
  return schema.parse(body);
}

export {
  DraftDecisionBodySchema,
  AgentEnableBodySchema,
  AgentConfigBodySchema,
} from "@/lib/api-schemas";
