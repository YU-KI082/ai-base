/**
 * Minimal semver helpers for dependency resolution.
 * Supports: "*", "1.2.3", "^1.2.0", "~1.2.0", ">=1.0.0"
 */

export type SemVer = { major: number; minor: number; patch: number };

export function parseSemVer(version: string): SemVer | null {
  const cleaned = version.trim().replace(/^v/, "");
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(cleaned);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function cmp(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function satisfiesVersion(version: string, range: string): boolean {
  const r = range.trim();
  if (!r || r === "*" || r === "x" || r === "latest") return true;
  const ver = parseSemVer(version);
  if (!ver) return false;

  if (r.startsWith("^")) {
    const base = parseSemVer(r.slice(1));
    if (!base) return false;
    if (ver.major !== base.major) return false;
    return cmp(ver, base) >= 0;
  }
  if (r.startsWith("~")) {
    const base = parseSemVer(r.slice(1));
    if (!base) return false;
    if (ver.major !== base.major || ver.minor !== base.minor) return false;
    return cmp(ver, base) >= 0;
  }
  if (r.startsWith(">=")) {
    const base = parseSemVer(r.slice(2));
    if (!base) return false;
    return cmp(ver, base) >= 0;
  }
  if (r.startsWith(">")) {
    const base = parseSemVer(r.slice(1));
    if (!base) return false;
    return cmp(ver, base) > 0;
  }
  if (r.startsWith("<=")) {
    const base = parseSemVer(r.slice(2));
    if (!base) return false;
    return cmp(ver, base) <= 0;
  }
  if (r.startsWith("<")) {
    const base = parseSemVer(r.slice(1));
    if (!base) return false;
    return cmp(ver, base) < 0;
  }
  const exact = parseSemVer(r);
  if (!exact) return false;
  return cmp(ver, exact) === 0;
}
