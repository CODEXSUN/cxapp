import { ArrowRight, FileCheck2, FolderCheck, Gauge, Workflow } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TenantProductPreview } from "../blocks/tenant-product-preview";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";

export function TenantPlatformStorySection() {
  const { portal } = useTenantSite();

  return (
    <section className="tenant-page-section tenant-platform-story">
      <TenantSectionHeading
        eyebrow="One connected billing flow"
        title="Move from quotation to invoice, compliance, collection, and accounts without losing the thread."
        summary={`${portal.brandName} keeps documents, staff actions, customer context, and the next step connected so billing stays fast without becoming careless.`}
        action={
          <Link to="/workspace">
            Explore the billing flow <ArrowRight />
          </Link>
        }
      />
      <TenantProductPreview />
      <div className="tenant-outcome-row">
        <article>
          <FileCheck2 />
          <div>
            <strong>Build the invoice once</strong>
            <p>
              Carry checked customer, item, tax, and totals through the rest of the document flow.
            </p>
          </div>
        </article>
        <article>
          <Workflow />
          <div>
            <strong>Guide every next step</strong>
            <p>
              Move from approval to e-way bill, e-invoice, receipt, and follow-up with less
              guesswork.
            </p>
          </div>
        </article>
        <article>
          <Gauge />
          <div>
            <strong>Monitor work in real time</strong>
            <p>
              See document progress, outstanding amounts, exceptions, and staff activity while they
              matter.
            </p>
          </div>
        </article>
        <article>
          <FolderCheck />
          <div>
            <strong>Keep a digital trail</strong>
            <p>
              Place invoices, receipts, attachments, and communication beside the transaction they
              explain.
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
