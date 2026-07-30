import { Plus } from "lucide-react";
import { TenantSectionHeading } from "./tenant-section-heading";

export type TenantFaqItem = {
  answer: string;
  question: string;
};

export function TenantFaq({
  items,
  title = "Questions billing teams ask before getting started"
}: {
  items: TenantFaqItem[];
  title?: string;
}) {
  return (
    <section className="tenant-page-section tenant-faq-section">
      <TenantSectionHeading eyebrow="Good to know" title={title} />
      <div className="tenant-faq-list">
        {items.map((item, index) => (
          <details key={item.question} open={index === 0}>
            <summary>
              <span>{item.question}</span>
              <Plus />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
