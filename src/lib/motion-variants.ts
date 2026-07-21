/**
 * Framer Motion variants — reusable animation presets for PIP-MLK.
 *
 * Usage:
 *   import { fadeInUp, staggerContainer } from "@/lib/motion-variants";
 *   <motion.div {...fadeInUp}>...</motion.div>
 *   <motion.div variants={staggerContainer} initial="initial" animate="animate">
 *     <motion.div variants={fadeInUp}>Child 1</motion.div>
 *     <motion.div variants={fadeInUp}>Child 2</motion.div>
 *   </motion.div>
 */
import type { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15 } },
};

export const slideInLeft: Variants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
    },
  },
};

export const pageTransition: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const tabTransition: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeInOut" } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.15, ease: "easeInOut" } },
};

/** Hover lift effect for interactive cards */
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.2 } },
  whileTap: { y: 0, transition: { duration: 0.1 } },
};

/** Scale on hover for buttons / icons */
export const hoverScale = {
  whileHover: { scale: 1.05, transition: { duration: 0.15 } },
  whileTap: { scale: 0.95, transition: { duration: 0.1 } },
};
