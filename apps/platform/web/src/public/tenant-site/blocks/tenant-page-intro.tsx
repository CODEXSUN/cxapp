import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { TenantPageVisual, type TenantPageVisualKind } from "./tenant-page-visual";

export function TenantPageIntro({
  actions,
  eyebrow,
  image,
  imageAlt,
  summary,
  title,
  visual
}: {
  actions?: ReactNode;
  eyebrow: string;
  image?: string;
  imageAlt?: string;
  summary: string;
  title: string;
  visual?: TenantPageVisualKind;
}) {
  const reduceMotion = useReducedMotion();
  const hasMedia = Boolean(image || visual);

  return (
    <section className={`tenant-page-intro${hasMedia ? " has-media" : ""}`}>
      <motion.span
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="tenant-portal-eyebrow"
      >
        <i /> {eyebrow}
      </motion.span>
      <motion.h1
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.6 }}
      >
        {title}
      </motion.h1>
      <motion.p
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.6 }}
      >
        {summary}
      </motion.p>
      {actions ? <div className="tenant-portal-actions">{actions}</div> : null}
      {image ? (
        <motion.figure
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.65 }}
        >
          <img src={image} alt={imageAlt ?? ""} />
        </motion.figure>
      ) : visual ? (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08, duration: 0.65 }}
          className="tenant-page-object-wrap"
        >
          <TenantPageVisual kind={visual} />
        </motion.div>
      ) : null}
    </section>
  );
}
