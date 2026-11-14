"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type HeroSlide = {
  slug: string;
  name: string;
  tagline: string;
  category: string;
  city: string;
  bannerUrl: string;
  logoUrl: string | null;
};

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 6000);
    return () => window.clearInterval(id);
  }, [paused, count]);

  if (count === 0) return null;

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      className="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Komunitas pilihan"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="carousel-track"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {slides.map((slide, i) => (
          <Link
            key={slide.slug}
            href={`/communities/${slide.slug}`}
            className="slide"
            aria-hidden={i !== index}
            tabIndex={i === index ? 0 : -1}
          >
            <img
              src={slide.bannerUrl}
              alt={`Komunitas ${slide.name}`}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="slide-body">
              <div className="slide-brand">
                <span className="slide-logo">
                  {slide.logoUrl ? <img src={slide.logoUrl} alt="" loading="lazy" /> : slide.name.slice(0, 1)}
                </span>
                <span className="slide-kicker">Komunitas pilihan</span>
              </div>
              <h3>{slide.name}</h3>
              {slide.tagline ? <p>{slide.tagline}</p> : null}
              <div className="slide-tags">
                {slide.category ? <span>{slide.category}</span> : null}
                {slide.city ? <span>{slide.city}</span> : null}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            className="carousel-arrow carousel-prev"
            aria-label="Komunitas sebelumnya"
            onClick={() => go(index - 1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            type="button"
            className="carousel-arrow carousel-next"
            aria-label="Komunitas berikutnya"
            onClick={() => go(index + 1)}
          >
            <span aria-hidden="true">›</span>
          </button>
          <div className="carousel-dots" role="tablist" aria-label="Pilih slide">
            {slides.map((slide, i) => (
              <button
                key={slide.slug}
                type="button"
                className="carousel-dot"
                role="tab"
                aria-label={slide.name}
                aria-current={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
