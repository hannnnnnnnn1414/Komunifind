"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SELECTOR = [
  ".card",
  ".event-row",
  ".stat",
  ".section-head",
  ".table-wrap",
  ".empty",
  ".prose",
  ".sidebar",
  ".cover",
].join(",");

export function ScrollReveal() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
    if (nodes.length === 0) return;

    const viewport = window.innerHeight;
    nodes.forEach((el, index) => {
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--rd", `${(index % 6) * 45}ms`);
      if (el.getBoundingClientRect().top < viewport * 0.94) {
        el.classList.add("is-visible");
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" },
    );

    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
