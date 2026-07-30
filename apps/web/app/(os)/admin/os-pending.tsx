"use client";

import type { ReactNode } from "react";

/** Shared「準備中」surface — use instead of fake data. */
export function OsPending({
  title = "準備中",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="os-pending" role="status">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
