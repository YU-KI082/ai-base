/**
 * Pre-publish policy checks — block unsafe / exaggerated / copyright-risky content.
 */

const FORBIDDEN = [
  /確実に稼げる/,
  /必ず儲かる/,
  /100%/,
  /保証します/,
  /get rich quick/i,
  /guaranteed income/i,
  /コピーした動画/,
  /無断転載/,
];

const COPYRIGHT_RISK = [
  /公式音源をそのまま/,
  /映画のワンシーン/,
  /他チャンネルの切り抜き/,
];

export type PolicyCheckResult = {
  ok: boolean;
  blocked: boolean;
  flags: string[];
  reasons: string[];
};

export function runAutoPolicyCheck(input: {
  content: string;
  platform: string;
  hashtags?: string[];
}): PolicyCheckResult {
  const flags: string[] = [];
  const reasons: string[] = [];
  const blob = `${input.content}\n${(input.hashtags ?? []).join(" ")}`;

  for (const re of FORBIDDEN) {
    if (re.test(blob)) {
      flags.push("exaggeration_or_forbidden");
      reasons.push(`Forbidden pattern: ${re}`);
    }
  }
  for (const re of COPYRIGHT_RISK) {
    if (re.test(blob)) {
      flags.push("copyright_risk");
      reasons.push(`Copyright risk: ${re}`);
    }
  }
  if (blob.length < 8) {
    flags.push("too_short");
    reasons.push("Content too short");
  }
  if (/password|api[_-]?key|secret/i.test(blob)) {
    flags.push("secret_leak_risk");
    reasons.push("Possible secret material in content");
  }

  const blocked = flags.some((f) =>
    ["exaggeration_or_forbidden", "copyright_risk", "secret_leak_risk"].includes(
      f,
    ),
  );
  return { ok: !blocked, blocked, flags, reasons };
}
