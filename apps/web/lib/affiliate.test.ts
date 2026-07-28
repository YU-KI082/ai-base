import { describe, it } from "node:test";
import assert from "node:assert/strict";

/** Pick public CTA target for a tool */
export function resolveAffiliateCta(input: {
  homepageUrl: string;
  links: Array<{ id: string; label: string; isHealthy: boolean; priority: number }>;
}): { href: string; label: string; tracked: boolean } {
  const primary = [...input.links]
    .filter((l) => l.isHealthy)
    .sort((a, b) => b.priority - a.priority)[0];
  if (!primary) {
    return { href: input.homepageUrl, label: "Visit website", tracked: false };
  }
  return {
    href: `/go/${primary.id}`,
    label: primary.label,
    tracked: true,
  };
}

describe("affiliate CTA", () => {
  it("prefers healthy high-priority tracked link", () => {
    const cta = resolveAffiliateCta({
      homepageUrl: "https://example.com",
      links: [
        { id: "1", label: "Low", isHealthy: true, priority: 1 },
        { id: "2", label: "Best", isHealthy: true, priority: 50 },
        { id: "3", label: "Broken", isHealthy: false, priority: 99 },
      ],
    });
    assert.deepEqual(cta, {
      href: "/go/2",
      label: "Best",
      tracked: true,
    });
  });

  it("falls back to homepage when no healthy links", () => {
    const cta = resolveAffiliateCta({
      homepageUrl: "https://example.com",
      links: [{ id: "1", label: "X", isHealthy: false, priority: 1 }],
    });
    assert.equal(cta.tracked, false);
    assert.equal(cta.href, "https://example.com");
  });
});
