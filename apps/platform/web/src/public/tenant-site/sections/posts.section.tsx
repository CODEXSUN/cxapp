import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { billingPosts } from "../tenant-site.content";

export function TenantPostsSection({
  eyebrow = "Billing journal",
  headline = "Practical ideas for cleaner invoices, better handovers, and stronger accounts.",
  showBlogLink = false
}: {
  eyebrow?: string;
  headline?: string;
  showBlogLink?: boolean;
}) {
  return (
    <section className="tenant-portal-section tenant-portal-updates">
      <header className="tenant-portal-section-heading">
        <span>{eyebrow}</span>
        <h2>{headline}</h2>
        {showBlogLink ? (
          <Link className="tenant-section-link" to="/blog">
            View all notes <ArrowRight />
          </Link>
        ) : null}
      </header>
      <div className="tenant-portal-post-grid">
        {billingPosts.slice(0, 3).map((post) => (
          <a href={post.href} key={post.title}>
            <span>{post.label}</span>
            <h3>{post.title}</h3>
            <p>{post.description}</p>
            <strong>
              Read more <ArrowRight />
            </strong>
          </a>
        ))}
      </div>
    </section>
  );
}
