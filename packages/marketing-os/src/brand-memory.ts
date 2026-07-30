import { prisma, repos } from "@ai-base/database";
import type { BrandMemory } from "./types.js";

export async function loadBrandMemory(
  workspaceId: string,
): Promise<BrandMemory | null> {
  const brand = await repos.brandProfiles.get(workspaceId);
  if (!brand) return null;
  return {
    brandName: brand.brandName,
    industry: brand.industry,
    targetAudience: brand.targetAudience,
    concept: brand.concept,
    worldview: brand.worldview,
    colors: brand.colors,
    competitors: brand.competitors,
    postTone: brand.postTone,
    products: brand.products,
    goals: brand.goals,
  };
}

export async function saveBrandMemory(
  workspaceId: string,
  input: BrandMemory,
) {
  const brand = await repos.brandProfiles.upsert(workspaceId, input);
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: input.brandName, setupDone: true },
  });
  return brand;
}

export function formatBrandForPrompt(brand: BrandMemory): string {
  return [
    `ブランド: ${brand.brandName}`,
    `業種: ${brand.industry}`,
    `ターゲット: ${brand.targetAudience}`,
    `コンセプト: ${brand.concept}`,
    `世界観: ${brand.worldview}`,
    `カラー: ${brand.colors}`,
    `競合: ${brand.competitors}`,
    `トーン: ${brand.postTone}`,
    `商品: ${brand.products}`,
    `目標: ${brand.goals}`,
  ].join("\n");
}
