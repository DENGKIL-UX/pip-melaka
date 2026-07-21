"use client";

/**
 * useHover3D — 3D tilt effect on hover for premium card interactions.
 *
 * Adds a perspective + rotateX/rotateY transform based on mouse position
 * over the element. Returns a ref to attach to the target element.
 *
 * Usage:
 *   const tiltRef = useHover3D<HTMLDivElement>();
 *   return <div ref={tiltRef}>...</div>;
 *
 * Inspired by Apple/Stripe card hover effects.
 */
import { useEffect, useRef } from "react";

export function useHover3D<T extends HTMLElement>(maxTilt: number = 8) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      el.style.transform = `perspective(1000px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg)`;
      el.style.transition = "transform 0.1s ease-out";
    };

    const handleMouseLeave = () => {
      el.style.transform = "perspective(1000px) rotateY(0deg) rotateX(0deg)";
      el.style.transition = "transform 0.5s ease";
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [maxTilt]);

  return ref;
}
