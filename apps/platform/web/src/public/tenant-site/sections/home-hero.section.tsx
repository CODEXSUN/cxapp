import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, BadgeCheck, Workflow } from "lucide-react";
import { useEffect, useState } from "react";
import { homeHeroSlides } from "../tenant-site.content";

export function TenantHomeHeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const slide = homeHeroSlides[activeSlide] ?? homeHeroSlides[0];

  useEffect(() => {
    if (paused || reduceMotion || homeHeroSlides.length < 2) return;

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % homeHeroSlides.length);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  function showRelativeSlide(offset: number) {
    setActiveSlide((current) => (current + offset + homeHeroSlides.length) % homeHeroSlides.length);
  }

  return (
    <section
      aria-label="CODEXSUN platform highlights"
      aria-roledescription="carousel"
      className="tenant-home-hero"
      id="top"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="tenant-home-hero-copy">
        <div className="tenant-home-hero-slide-copy" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              className={`tenant-home-hero-message is-${slide.tone}`}
              key={`${activeSlide}-${slide.title}`}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="tenant-portal-eyebrow">
                <i /> {slide.eyebrow}
              </span>
              <h1>{slide.title}</h1>
              <p>{slide.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="tenant-home-hero-footer">
          <div className="tenant-home-hero-controls">
            <button
              aria-label="Show previous platform highlight"
              className="tenant-home-hero-arrow"
              onClick={() => showRelativeSlide(-1)}
              type="button"
            >
              <ArrowLeft />
            </button>
            <div className="tenant-home-hero-dots" aria-label="Choose a platform highlight">
              {homeHeroSlides.map((item, index) => (
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
              aria-label="Show next platform highlight"
              className="tenant-home-hero-arrow"
              onClick={() => showRelativeSlide(1)}
              type="button"
            >
              <ArrowRight />
            </button>
          </div>
          <div className="tenant-home-powered-by">
            <span>Powered by</span>
            <strong>AARAN SOFTWARE</strong>
          </div>
        </div>
      </div>

      <div className="tenant-home-hero-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            className="tenant-home-hero-media"
            key={`${activeSlide}-${slide.image}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src={slide.image} alt={slide.imageAlt} />
            <figcaption>
              <span>
                <BadgeCheck /> {slide.captionPrimary}
              </span>
              <span>
                <Workflow /> {slide.captionSecondary}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
    </section>
  );
}
