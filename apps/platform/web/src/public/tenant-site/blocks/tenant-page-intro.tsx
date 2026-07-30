import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function TenantPageIntro({
  actions,
  eyebrow,
  summary,
  title
}: {
  actions?: ReactNode;
  eyebrow: string;
  summary: string;
  title: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="tenant-page-intro">
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
    </section>
  );
}
