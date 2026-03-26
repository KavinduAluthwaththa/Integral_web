"use client";

import { useMemo, useRef } from "react";
import { ReactLenis as Lenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import styles from "@styles/visual.module.css";
import VisualFlipCard from "./visual-flip-card";

gsap.registerPlugin(ScrollTrigger);

const VISUAL_TOTAL_SCROLL_VH = 3;
const VISUAL_CARD_STAGGER = 0.05;
const VISUAL_ANIMATION_WINDOW = 1 / 3;

const VISUAL_TITLE_WORDS = "We Speak What You Lived, Bare Witness And Be Your Voice, Because...".split(" ");

export default function VisualScrollCards() {
  const visualRootRef = useRef(null);
  const visualCardsSectionRef = useRef(null);
  const visualCardElsRef = useRef([]);
  const visualTitleRef = useRef(null);

  const visualCardsConfig = useMemo(
    () => [
      {
        visualCardId: "visual-card-1",
        visualFrontSrc: "/visual/card.png",
        visualFrontAlt: "Card Image",
        visualBackText: "your\nstory\nmatters",
      },
    ],
    [],
  );

  useGSAP(
    () => {
      if (!visualRootRef.current) return;
      if (!visualCardsSectionRef.current) return;

      const visualCards = visualCardElsRef.current.filter(Boolean);
      if (visualCards.length === 0) return;

      const totalScrollHeightPx = window.innerHeight * VISUAL_TOTAL_SCROLL_VH;

      // Word-by-word fade-in for the title section
      const titleWordEls = visualTitleRef.current
        ? visualTitleRef.current.querySelectorAll("[data-visual-word]")
        : [];

      const titleWordTween =
        titleWordEls.length > 0
          ? gsap.fromTo(
              titleWordEls,
              { opacity: 0, y: 30 },
              {
                opacity: 1,
                y: 0,
                stagger: 0.1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: visualTitleRef.current,
                  start: "top 78%",
                  toggleActions: "play none none reverse",
                },
              },
            )
          : null;

      const pinnedCardsTrigger = ScrollTrigger.create({
        trigger: visualCardsSectionRef.current,
        start: "top top",
        end: () => `+=${totalScrollHeightPx}`,
        pin: true,
        pinSpacing: true,
      });

      const perCardTriggers = visualCards.map((cardEl, cardIndex) => {
        const cardFrontEl = cardEl.querySelector('[data-visual-face="front"]');
        const cardBackEl = cardEl.querySelector('[data-visual-face="back"]');

        const staggerOffset = cardIndex * VISUAL_CARD_STAGGER;
        const startOffset = VISUAL_ANIMATION_WINDOW + staggerOffset;
        const endOffset = VISUAL_ANIMATION_WINDOW * 2 + staggerOffset;

        return ScrollTrigger.create({
          trigger: visualCardsSectionRef.current,
          start: "top top",
          end: () => `+=${totalScrollHeightPx}`,
          scrub: 1,
          onUpdate: (self) => {
            const progress = self.progress;
            if (progress < startOffset || progress > endOffset) return;

            const animationProgress =
              (progress - startOffset) / VISUAL_ANIMATION_WINDOW;

            const frontRotation = -180 * animationProgress;
            const backRotation = 180 - 180 * animationProgress;

            gsap.to(cardFrontEl, { rotateY: frontRotation, ease: "power1.out" });
            gsap.to(cardBackEl, { rotateY: backRotation, ease: "power1.out" });
          },
        });
      });

      return () => {
        titleWordTween?.scrollTrigger?.kill();
        titleWordTween?.kill();
        pinnedCardsTrigger.kill();
        perCardTriggers.forEach((t) => t.kill());
      };
    },
    { scope: visualRootRef },
  );

  return (
    <Lenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <div className={styles.visualRoot} ref={visualRootRef}>
        <div className={styles.visualFullHeightPage}>
          <div className={styles.visualContainer}>
            <section className={styles.visualSection}>
              <h1 className={styles.visualSectionTitle} ref={visualTitleRef}>
                {VISUAL_TITLE_WORDS.map((word, i) => (
                  <span
                    key={i}
                    data-visual-word
                    className={styles.visualWord}
                  >
                    {word}
                    {i < VISUAL_TITLE_WORDS.length - 1 ? "\u00A0" : ""}
                  </span>
                ))}
              </h1>
            </section>

            <section
              className={styles.visualSection}
              ref={visualCardsSectionRef}
              aria-label="Visual scroll cards"
            >
              {visualCardsConfig.map((cardConfig, idx) => (
                <VisualFlipCard
                  key={cardConfig.visualCardId}
                  {...cardConfig}
                  ref={(el) => {
                    visualCardElsRef.current[idx] = el;
                  }}
                />
              ))}
            </section>

          </div>
        </div>
      </div>
    </Lenis>
  );
}

