"use client";

/**
 * LoadingSequence — progressive loading with skeleton → fade-in content.
 *
 * Shows a skeleton placeholder while isLoading is true, then fades in
 * the real content with a smooth transition.
 *
 * Usage:
 *   <LoadingSequence isLoading={loading}>
 *     <RealContent />
 *   </LoadingSequence>
 */
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeInUp } from "@/lib/motion-variants";

interface LoadingSequenceProps {
  children: React.ReactNode;
  isLoading: boolean;
  variant?: "card" | "list" | "map";
}

export function LoadingSequence({
  children,
  isLoading,
  variant = "card",
}: LoadingSequenceProps) {
  const skeleton = () => {
    if (variant === "map") {
      return (
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      );
    }
    if (variant === "list") {
      return (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      );
    }
    // card variant
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {skeleton()}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
