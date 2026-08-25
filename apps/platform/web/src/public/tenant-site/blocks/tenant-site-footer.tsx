import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, GitFork } from "lucide-react";
import type { SVGProps } from "react";
import { useTenantSite } from "../tenant-site.context";
import { TenantSiteLogo } from "./tenant-site-logo";

const socialLinks = [
  {
    href: "https://www.facebook.com/codexsun",
    icon: FacebookIcon,
    label: "CODEXSUN on Facebook",
    tone: "facebook"
  },
  {
    href: "https://x.com/codexsun",
    icon: XIcon,
    label: "CODEXSUN on X",
    tone: "x"
  },
  {
    href: "https://www.instagram.com/codexsun",
    icon: InstagramIcon,
    label: "CODEXSUN on Instagram",
    tone: "instagram"
  },
  {
    href: "https://github.com/CODEXSUN",
    icon: GitFork,
    label: "CODEXSUN on GitHub",
    tone: "github"
  },
  {
    href: "https://www.linkedin.com/company/codexsun",
    icon: LinkedInIcon,
    label: "CODEXSUN on LinkedIn",
    tone: "linkedin"
  },
  {
    href: "https://www.youtube.com/@codexsun",
    icon: YouTubeIcon,
    label: "CODEXSUN on YouTube",
    tone: "youtube"
  }
] as const;

export function TenantSiteFooter() {
  const { authenticated, portal } = useTenantSite();

  return (
    <footer className="tenant-portal-footer tenant-editorial-footer">
      <section className="tenant-footer-brief">
        <div>
          <span>CODEXSUN BUSINESS OPERATING PLATFORM</span>
          <h2>
            Run billing, accounts, records, communication, staff work, and automation in one
            connected platform.
          </h2>
        </div>
        <Link to="/features">
          Explore capabilities <ArrowRight />
        </Link>
      </section>
      <div className="tenant-footer-main">
        <div className="tenant-portal-footer-brand">
          <div>
            <TenantSiteLogo
              brandName={portal.brandName}
              className="tenant-portal-mark"
              logoDarkUrl={portal.logoDarkUrl}
              logoUrl={portal.logoUrl}
            />
            <strong>{portal.brandName}</strong>
          </div>
          <p>
            Features, automation, billing, accounts, communication, records, and daily operations in
            one connected business product.
          </p>
          <nav className="tenant-footer-socials" aria-label="Connect with CODEXSUN">
            {socialLinks.map(({ href, icon: Icon, label, tone }) => (
              <a
                aria-label={label}
                className={`is-${tone}`}
                href={href}
                key={label}
                rel={href.startsWith("http") ? "noreferrer" : undefined}
                target={href.startsWith("http") ? "_blank" : undefined}
                title={label}
              >
                <Icon aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
        <div className="tenant-portal-footer-links">
          <section>
            <strong>Product</strong>
            <Link to="/workspace">Platform overview</Link>
            <Link to="/features">Capabilities</Link>
            <Link to="/security">Security</Link>
            <Link to="/updates">Product updates</Link>
            <a href={authenticated ? "/app/" : portal.loginPath}>
              {authenticated ? "Dashboard" : "Log in"}
            </a>
          </section>
          <section>
            <strong>Stories</strong>
            <Link to="/blog">Daily stories</Link>
            <Link to="/features">Technology</Link>
            <Link to="/updates">Automation</Link>
            <Link to="/workspace">Billing guide</Link>
          </section>
          <section>
            <strong>Company</strong>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/status">Platform status</Link>
            {portal.publicSiteUrl ? (
              <a href={portal.publicSiteUrl}>
                Public site <ExternalLink />
              </a>
            ) : null}
          </section>
        </div>
      </div>
      <div className="tenant-portal-footer-bottom">
        <span>Clear work, trusted records, and practical automation in one platform.</span>
        <span className="tenant-footer-bottom-powered">
          Powered by <strong>AARAN SOFTWARE — Sundar</strong>
        </span>
        <span>
          © {new Date().getFullYear()} {portal.brandName}
        </span>
      </div>
    </footer>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M14 8h3V4.5h-3c-3 0-5 2-5 5V12H6v4h3v6h4v-6h3.2l.8-4H13V9.5c0-1 .5-1.5 1-1.5Z" />
    </svg>
  );
}

function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M5 4l14 16M19 4L5 20" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path d="M6 9v10M6 5.5v.5M10.5 19v-6c0-2.2 1.4-3.8 3.6-3.8 2.4 0 3.9 1.6 3.9 4.3V19M10.5 9.5V19" />
    </svg>
  );
}

function YouTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <rect x="2.5" y="6" width="19" height="12" rx="4" />
      <path d="m10 9 5 3-5 3V9Z" />
    </svg>
  );
}
