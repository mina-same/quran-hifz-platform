import { useEffect, useRef, useState } from "react";

/**
 * The intro slides that sit beside the login form — the web counterpart of the
 * mobile app's `app/onboarding.tsx`. Same three illustrations and the same
 * copy, so a user who meets the platform on either client sees one story.
 *
 * Unlike mobile this is not a gate: there is no "seen once" flag and nothing to
 * dismiss. It is a panel on the login page, so it simply cycles while the user
 * signs in.
 */

const SLIDES = [
  {
    image: "/quran/onboarding/1.png",
    title: "حفظ القرآن الكريم\nنور لحياتك",
    desc: "نساعدك على حفظ كتاب الله وتدبره خطوة بخطوة بإذن الله.",
  },
  {
    image: "/quran/onboarding/2.png",
    title: "متابعة يومية\nوتشجيع مستمر",
    desc: "خطط يومية مرنة، وإحصائيات تساعدك على الاستمرار وتحقيق أهدافك.",
  },
  {
    image: "/quran/onboarding/3.png",
    title: "اجعل القرآن\nجزءاً من يومك",
    desc: "منصة تجمع لك الأدوات والمجتمع لتعيش رحلة حفظ مميزة.",
  },
];

const ADVANCE_MS = 2000;

export function LoginIntro() {
  const [index, setIndex] = useState(0);
  // Pauses the carousel while the pointer is over it or a dot has focus, so it
  // cannot slide out from under someone who is reading or clicking.
  const [paused, setPaused] = useState(false);

  const next = () => setIndex((i) => (i + 1) % SLIDES.length);
  const prev = () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  // Respect a reduced-motion preference by holding on the first slide.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) setPaused(true);
  }, []);

  // Touch swipe, mirroring the mobile gesture: drag left for the next slide.
  const touchX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -40) next();
    else if (dx > 40) prev();
    touchX.current = null;
  }

  const slide = SLIDES[index];

  return (
    <div
      className="login-intro"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="login-intro-stage">
        {SLIDES.map((s, i) => (
          // All three stay mounted and cross-fade, so the browser is not
          // decoding a fresh image on every advance.
          <img
            key={s.image}
            src={s.image}
            alt=""
            aria-hidden={i !== index}
            className={`login-intro-img ${i === index ? "active" : ""}`}
            /* The first slide is what the visitor actually waits on. */
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
      </div>

      <div className="login-intro-copy" aria-live="polite">
        <h2 className="login-intro-title">{slide.title}</h2>
        <p className="login-intro-desc">{slide.desc}</p>
      </div>

      <div className="login-intro-dots">
        {SLIDES.map((s, i) => (
          <button
            key={s.image}
            type="button"
            className={`login-intro-dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            aria-label={`الشريحة ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  );
}
