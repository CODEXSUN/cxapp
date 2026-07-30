import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { TenantPageIntro } from "../blocks/tenant-page-intro";
import { TenantPortalCta } from "../blocks/tenant-portal-cta";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { billingPosts } from "../tenant-site.content";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteTemplate } from "../templates/tenant-site.template";

export function TenantBlogPage() {
  return (
    <TenantSiteTemplate activePage="blog" pageTitle="Blog">
      <BlogPageContent />
    </TenantSiteTemplate>
  );
}

function BlogPageContent() {
  const { portal } = useTenantSite();
  const featuredPost = billingPosts[0];
  const remainingPosts = billingPosts.slice(1);

  return (
    <>
      <TenantPageIntro
        eyebrow={`${portal.brandName} billing journal`}
        title="Practical thinking for cleaner invoices, stronger accounts, and easier staff adoption."
        summary="Short, useful guidance for the billing problems teams face every day—from repeated entry and compliance checks to collections and handovers."
        actions={
          <a className="tenant-portal-secondary" href={portal.loginPath}>
            Open the application <ArrowRight />
          </a>
        }
      />
      {featuredPost ? (
        <section className="tenant-page-section tenant-blog-feature">
          <TenantSectionHeading
            eyebrow="Featured perspective"
            title="Start with the workflow that shapes every billing day."
          />
          <a href={featuredPost.href} className="tenant-featured-post">
            <div className="tenant-featured-post-visual">
              <span>BILLING / JOURNAL</span>
              <BookOpen />
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
            <article>
              <span>{featuredPost.label}</span>
              <h2>{featuredPost.title}</h2>
              <p>{featuredPost.description}</p>
              <strong>
                Read the full note <ArrowUpRight />
              </strong>
            </article>
          </a>
        </section>
      ) : null}
      <section className="tenant-page-section tenant-blog-index">
        <TenantSectionHeading
          eyebrow="Ideas for the working team"
          title="Useful guidance from invoice creation to payment follow-up."
          summary="Explore document accuracy, e-way bills, e-invoices, accounts review, staff handovers, and digital record keeping."
        />
        <div className="tenant-blog-grid">
          {remainingPosts.map((post, index) => (
            <a href={post.href} key={post.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <small>{post.label}</small>
              <h3>{post.title}</h3>
              <p>{post.description}</p>
              <strong>
                Read note <ArrowRight />
              </strong>
            </a>
          ))}
        </div>
      </section>
      <section className="tenant-page-section tenant-editorial-lanes">
        <TenantSectionHeading
          eyebrow="Explore by intent"
          title="Move from an idea into a better daily billing habit."
        />
        <div>
          <Link to="/workspace">
            <BookOpen />
            <span>
              <strong>Billing experience</strong>
              <small>See how invoices, compliance, and accounts connect.</small>
            </span>
            <ArrowRight />
          </Link>
          <Link to="/security">
            <ShieldCheck />
            <span>
              <strong>Staff control and accuracy</strong>
              <small>Keep access, handovers, checks, and history clear.</small>
            </span>
            <ArrowRight />
          </Link>
          <Link to="/updates">
            <Sparkles />
            <span>
              <strong>Product improvements</strong>
              <small>Follow the billing experience as it becomes faster and clearer.</small>
            </span>
            <ArrowRight />
          </Link>
        </div>
      </section>
      <TenantPortalCta
        title="Ready to put the ideas into daily work?"
        summary="Sign in to create billing documents, review accounts, and continue pending work."
      />
    </>
  );
}
