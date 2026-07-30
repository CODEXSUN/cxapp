import {
  ArrowRight,
  ClipboardCheck,
  FileClock,
  KeyRound,
  ListChecks,
  ShieldCheck
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { TenantSectionHeading } from "../blocks/tenant-section-heading";
import { useTenantSite } from "../tenant-site.context";

export function TenantSecuritySection({ compact = false }: { compact?: boolean }) {
  const { portal } = useTenantSite();

  return (
    <section
      className={`tenant-page-section tenant-security-section${compact ? " is-compact" : ""}`}
    >
      <TenantSectionHeading
        eyebrow="Control without slowing work"
        title="Give every person the access they need—and keep every important billing action clear."
        summary={`${portal.brandName} combines staff responsibility, document checks, visible status, and activity history so control becomes part of the billing flow.`}
        action={
          compact ? (
            <Link to="/security">
              Billing controls <ArrowRight />
            </Link>
          ) : undefined
        }
      />
      <div className="tenant-security-model">
        <div className="tenant-security-core">
          <span className="tenant-security-ring ring-one" />
          <span className="tenant-security-ring ring-two" />
          <span className="tenant-security-ring ring-three" />
          <div>
            <ShieldCheck />
            <strong>CONTROL</strong>
            <small>Clear billing responsibility</small>
          </div>
        </div>
        <div className="tenant-security-controls">
          <article>
            <KeyRound />
            <span>
              <strong>Staff access by responsibility</strong>
              <small>People see the billing areas and actions needed for their work.</small>
            </span>
          </article>
          <article>
            <FileClock />
            <span>
              <strong>Smoother staff handover</strong>
              <small>Pending work and history remain visible when responsibilities change.</small>
            </span>
          </article>
          <article>
            <ClipboardCheck />
            <span>
              <strong>Checks before final action</strong>
              <small>
                Validation and status help catch missing or inconsistent document details.
              </small>
            </span>
          </article>
          <article>
            <ListChecks />
            <span>
              <strong>Traceable document activity</strong>
              <small>
                Important changes, approvals, and lifecycle actions remain easier to review.
              </small>
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
