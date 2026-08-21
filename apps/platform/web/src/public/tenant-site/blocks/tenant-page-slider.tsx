import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export type TenantPageSlide = {
  eyebrow: string;
  summary: string;
  title: string;
};

export function TenantPageSlider({
  actions,
  slides
}: {
  actions?: ReactNode;
  slides: readonly TenantPageSlide[];
}) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const slide = slides[activeSlide] ?? slides[0];

  useEffect(() => {
    if (paused || reduceMotion || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  if (!slide) return null;

  function showRelativeSlide(offset: number) {
    setActiveSlide((current) => (current + offset + slides.length) % slides.length);
  }

  return (
    <section
      aria-label="Billing highlights"
      aria-roledescription="carousel"
      className="tenant-page-intro tenant-page-slider"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="tenant-page-slider-content" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="tenant-page-slider-slide"
            key={`${activeSlide}-${slide.title}`}
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="tenant-portal-eyebrow">
              <i /> {slide.eyebrow}
            </span>
            <h1>{slide.title}</h1>
            <p>{slide.summary}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="tenant-page-slider-footer">
        {actions ? <div className="tenant-portal-actions">{actions}</div> : <span />}
        <div className="tenant-page-slider-controls">
          <button
            aria-label="Show previous billing highlight"
            className="tenant-page-slider-arrow"
            onClick={() => showRelativeSlide(-1)}
            type="button"
          >
            <ArrowLeft />
          </button>
          <div className="tenant-page-slider-dots" aria-label="Choose a billing highlight">
            {slides.map((item, index) => (
              <button
                aria-current={index === activeSlide ? "true" : undefined}
                aria-label={`Show slide ${index + 1}: ${item.title}`}
                key={item.title}
                onClick={() => setActiveSlide(index)}
                type="button"
              />
            ))}
          </div>
          <button
            aria-label="Show next billing highlight"
            className="tenant-page-slider-arrow"
            onClick={() => showRelativeSlide(1)}
            type="button"
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </section>
  );
}
