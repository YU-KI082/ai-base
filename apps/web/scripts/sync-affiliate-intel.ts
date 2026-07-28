import { proposeAspInvestigations } from "@ai-base/affiliate-intel";
import { prisma, repos } from "@ai-base/database";

async function main() {
  const tools = await repos.tools.findPublished("en", { take: 50 });
  const proposals = proposeAspInvestigations();
  const before = new Set(
    (await repos.affiliateIntel.listIntelligence()).map((i) => i.toolId),
  );
  let created = 0;
  for (const t of tools) {
    await repos.affiliateIntel.ensureForTool({
      toolId: t.id,
      homepageUrl: t.homepageUrl,
      leads: proposals.map((p) => ({
        aspKey: p.aspKey,
        aspLabel: p.aspLabel,
        status: p.status,
        notes: p.notes,
        proposedBy: "verify",
      })),
    });
    if (!before.has(t.id)) created += 1;
  }
  const perf = await repos.affiliateIntel.performanceByTool();
  console.log(
    JSON.stringify(
      {
        tools: tools.length,
        created,
        cases: perf.length,
        asps: perf[0]?.intelligence.leads.length,
        sampleStatus: perf[0]?.intelligence.status,
        hasAffiliate: perf[0]?.intelligence.hasAffiliate,
        aspLabels: perf[0]?.intelligence.leads.map((l) => l.aspLabel),
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
