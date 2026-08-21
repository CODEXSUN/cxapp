import { ArrowRight, Banknote, FileCheck2, ReceiptText } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantWorkspacePage() {
  return (
    <TenantSiteTemplate activePage="workspace" pageTitle="Product">
      <WorkspacePageContent />
    </TenantSiteTemplate>
  );
}

function WorkspacePageContent() {
  const { portal } = useTenantSite();

  return (
    <>
      <TenantPageIntro
        actions={
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Open billing <ArrowRight />
          </a>
        }
        eyebrow="Billing and accounts"
        summary="Create GST invoices, continue into compliance, record collections, and keep the source transaction close to every next action."
        title="One clear flow from quotation to payment."
        visual="billing"
      />
      <section className="tenant-page-section tenant-simple-section">
        <TenantSectionHeading
          eyebrow="The daily flow"
          title="Enter the transaction once. Keep the next step obvious."
        />
        <div className="tenant-simple-grid is-three">
          <article>
            <ReceiptText />
            <span>GST billing</span>
            <h3>Create a complete invoice without slowing down.</h3>
            <p>Reuse customer, product, HSN, tax, price, and terms across documents.</p>
          </article>
          <article>
            <FileCheck2 />
            <span>Compliance</span>
            <h3>Continue into e-way bill and e-invoice preparation.</h3>
            <p>Carry checked billing information forward instead of typing it again.</p>
          </article>
          <article>
            <Banknote />
            <span>Collections</span>
            <h3>See what was billed, received, paid, or still due.</h3>
            <p>Keep receipts, payments, balances, and follow-up beside the transaction.</p>
          </article>
        </div>
      </section>
      <section className="tenant-page-band is-blue">
        <div>
          <span>One working rhythm</span>
          <h2>Quotation → invoice → compliance → collection</h2>
        </div>
        <p>Clear for new staff. Detailed enough for careful accounts work.</p>
      </section>
      <TenantPortalCta
        title="Ready to bring billing and collections into one flow?"
        summary="Open the application and continue from the work already waiting for you."
      />
    </>
  );
}
