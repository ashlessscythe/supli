"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  /**
   * Delay in ms. Keep small for tasteful stagger.
   */
  delayMs?: number;
  /**
   * Starting offset. Defaults to 10px.
   */
  y?: number;
};

export function Reveal({ children, className, delayMs = 0, y = 10 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  const style = useMemo(() => {
    return {
      transitionDelay: `${delayMs}ms`,
      transform: visible ? "translateY(0px)" : `translateY(${y}px)`,
    } as React.CSSProperties;
  }, [delayMs, visible, y]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { root: null, threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out will-change-[opacity,transform]",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

