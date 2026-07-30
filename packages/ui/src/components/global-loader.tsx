import { motion } from "framer-motion";

import { cn } from "../lib/utils";

const ringTransition = {
  ease: "linear",
  repeat: Infinity
} as const;

type GlobalLoaderProps = {
  className?: string;
  fullScreen?: boolean;
};

export function GlobalLoader({ className, fullScreen = true }: GlobalLoaderProps) {
  return (
    <div
      className={cn(
        "global-loader",
        fullScreen ? "global-loader-fullscreen" : "global-loader-inline",
        className
      )}
    >
      <div className="global-loader-mark" role="status" aria-label="Loading">
        <div className="global-loader-core" />
        <motion.div
          animate={{ rotate: 360 }}
          className="global-loader-ring global-loader-ring-accent"
          transition={{ ...ringTransition, duration: 3 }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          className="global-loader-ring global-loader-ring-dark"
          transition={{ ...ringTransition, duration: 2.5 }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          className="global-loader-ring global-loader-ring-soft"
          transition={{ ...ringTransition, duration: 4 }}
        />
        <div className="global-loader-logo" aria-hidden="true">
          <img className="dark:hidden" src="/logo/logo.svg" alt="" />
          <img className="hidden dark:block" src="/logo/logo-dark.svg" alt="" />
        </div>
      </div>
    </div>
  );
}
