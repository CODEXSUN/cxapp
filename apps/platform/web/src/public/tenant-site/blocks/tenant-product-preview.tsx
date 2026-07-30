import {
  Activity,
  ArrowUpRight,
  FileCheck2,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { useTenantSite } from "../tenant-site.context";
import { billingSlides } from "../tenant-site.content";

export function TenantProductPreview({ label = "Live billing overview" }: { label?: string }) {
  const { portal } = useTenantSite();

  return (
    <div className="tenant-product-preview">
      <aside>
        <div className="tenant-product-preview-brand">
          <span>{portal.brandName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{portal.brandName}</strong>
            <small>Billing &amp; Accounts</small>
          </div>
        </div>
        <nav aria-label="Illustrative billing areas">
          <span className="is-active">
            <LayoutDashboard /> Live overview
          </span>
          <span>
            <ReceiptText /> Sales invoices
          </span>
          <span>
            <FileCheck2 /> E-way &amp; e-invoice
          </span>
          <span>
            <UsersRound /> Staff activity
          </span>
        </nav>
        <div className="tenant-product-preview-access">
          <ShieldCheck />
          <span>
            <strong>Staff controls</strong>
            <small>Access by responsibility</small>
          </span>
        </div>
      </aside>
      <section>
        <header>
          <div>
            <small>{label}</small>
            <strong>Billing command view</strong>
          </div>
          <span>
            <i /> Operations ready
          </span>
        </header>
        <div className="tenant-product-preview-context">
          <article>
            <small>Today&apos;s sales</small>
            <strong>Live totals</strong>
          </article>
          <article>
            <small>Receivables</small>
            <strong>Follow-up queue</strong>
          </article>
          <article>
            <small>Documents</small>
            <strong>Invoice · E-way · E-invoice</strong>
          </article>
        </div>
        <div className="tenant-product-preview-feed">
          <header>
            <div>
              <Activity />
              <span>
                <strong>Billing flow</strong>
                <small>From sale to collection</small>
              </span>
            </div>
            <ArrowUpRight />
          </header>
          {billingSlides.map((slide, index) => (
            <article key={slide.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{slide.title}</strong>
                <small>{slide.description}</small>
              </div>
              <i />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
