import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BadgeCheck, ExternalLink, UserRoundCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTenantSite } from "../tenant-site.context";
import { billingSlides } from "../tenant-site.content";

export function TenantHomeHeroSection() {
  const { portal } = useTenantSite();
  const [activeSlide, setActiveSlide] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion || billingSlides.length < 2) return;
    const timer = window.setInterval(
      () => setActiveSlide((current) => (current + 1) % billingSlides.length),
      6000
    );
    return () => window.clearInterval(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (activeSlide >= billingSlides.length) setActiveSlide(0);
  }, [activeSlide]);

  const slide = billingSlides[activeSlide] ?? billingSlides[0];

  return (
    <section className="tenant-portal-hero" id="top">
      <div className="tenant-portal-hero-copy">
        <motion.span
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="tenant-portal-eyebrow"
        >
          <i /> Billing that keeps work moving
        </motion.span>
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.65 }}
        >
          Invoice faster. Stay accurate. Know what happens next.
        </motion.h1>
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.65 }}
        >
          Create invoices, prepare e-way bills and e-invoices, follow accounts, and keep staff work
          visible from one clean business system.
        </motion.p>
        <div className="tenant-portal-actions">
          <a className="tenant-portal-primary" href={portal.loginPath}>
            Start billing <ArrowRight />
          </a>
          {portal.publicSiteUrl ? (
            <a className="tenant-portal-secondary" href={portal.publicSiteUrl}>
              Visit public site <ExternalLink />
            </a>
          ) : null}
        </div>
        <div className="tenant-portal-trust">
          <span>
            <BadgeCheck /> Accurate billing flow
          </span>
          <span>
            <UserRoundCheck /> Easy staff adoption
          </span>
        </div>
      </div>

      <div className="tenant-portal-slider">
        <div className="tenant-portal-window-bar">
          <span>
            <i />
            <i />
            <i />
          </span>
          <em>BILLING / LIVE</em>
        </div>
        <div className="tenant-portal-slide-stage">
          <AnimatePresence mode="wait">
            <motion.article
              key={`${activeSlide}-${slide.title}`}
              initial={reduceMotion ? false : { opacity: 0, x: 22 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -18 }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>{slide.label}</span>
              <h2>{slide.title}</h2>
              <p>{slide.description}</p>
            </motion.article>
          </AnimatePresence>
          <div className="tenant-portal-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
            <strong>{String(activeSlide + 1).padStart(2, "0")}</strong>
          </div>
        </div>
        <div className="tenant-portal-slider-nav" aria-label="Billing highlights">
          {billingSlides.map((item, index) => (
            <button
              type="button"
              aria-label={`Show ${item.title}`}
              aria-current={index === activeSlide}
              key={item.title}
              onClick={() => setActiveSlide(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <i />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
