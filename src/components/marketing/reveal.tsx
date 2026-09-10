"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Subtle entrance animation, mount-based (not scroll-gated) so content is never
 * left hidden if JS is slow or an IntersectionObserver misfires. Reduced-motion
 * users get the content with no transform at all.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {children}
    </motion.div>
  );
}
