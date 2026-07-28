import Link from "next/link";
import { withLocale, type PublicLocale } from "@/lib/site";

type ToolCardProps = {
  locale: PublicLocale;
  slug: string;
  name: string;
  description?: string | null;
  pricingModel?: string | null;
  categoryNames?: string[];
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function ToolCard({
  locale,
  slug,
  name,
  description,
  pricingModel,
  categoryNames = [],
}: ToolCardProps) {
  return (
    <li className="card-surface tool-card animate-in">
      <Link
        href={withLocale(`/tools/${slug}`, locale)}
        className="tool-card-link"
      >
        <div className="tool-card-title">
          <span className="tool-card-name">{name}</span>
          {pricingModel && pricingModel !== "unknown" ? (
            <span className="pill">{pricingModel}</span>
          ) : null}
        </div>
        {description ? (
          <p className="tool-card-desc">{truncate(description, 160)}</p>
        ) : null}
        {categoryNames.length > 0 ? (
          <div className="tool-card-meta">
            {categoryNames.slice(0, 3).map((c) => (
              <span key={c} className="pill">
                {c}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </li>
  );
}

export { truncate };
