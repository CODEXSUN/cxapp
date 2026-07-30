import { motion, useReducedMotion } from "framer-motion";
import { Activity, FileCheck2, Landmark, ReceiptText, Route, Workflow } from "lucide-react";
import { billingFeatures } from "../tenant-site.content";

const featureIcons = [ReceiptText, Route, FileCheck2, Landmark, Activity, Workflow];

export function TenantFeaturesSection({
  eyebrow = "Built for daily billing",
  headline = "Everything the team needs to bill, check, follow up, and close the day with confidence."
}: {
  eyebrow?: string;
  headline?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="tenant-portal-section">
      <header className="tenant-portal-section-heading">
        <span>{eyebrow}</span>
        <h2>{headline}</h2>
      </header>
      <div className="tenant-portal-feature-grid">
        {billingFeatures.map((feature, index) => {
          const Icon = featureIcons[index % featureIcons.length]!;
          return (
            <motion.article
              key={feature.title}
              initial={reduceMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ amount: 0.2, once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
            >
              <div>
                <Icon />
                <span>{feature.label}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
