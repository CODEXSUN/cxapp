import type { ReactNode } from "react";

export function TenantSectionHeading({
  action,
  eyebrow,
  summary,
  title
}: {
  action?: ReactNode;
  eyebrow: string;
  summary?: string;
  title: string;
}) {
  return (
    <header className="tenant-rich-heading">
      <span>{eyebrow}</span>
      <div>
        <h2>{title}</h2>
        {summary ? <p>{summary}</p> : null}
      </div>
      {action ? <div className="tenant-rich-heading-action">{action}</div> : null}
    </header>
  );
}
