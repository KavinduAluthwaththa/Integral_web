"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { ReactLenis as Lenis } from "lenis/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import styles from "@styles/landing.module.css";
import { landingSplitTextIntoWordSpans } from "@utils/landing-text-split";

gsap.registerPlugin(ScrollTrigger);

const LANDING_SCROLL_MULTIPLIER = 3.5;

export default function LandingLandingPage() {
  const landingRootRef = useRef(null);
  const heroSectionRef = useRef(null);
  const heroHeaderRef = useRef(null);
  const heroCopyTextRef = useRef(null);
  const heroImageFrameRef = useRef(null);
  const aboutSectionRef = useRef(null);

  const landingAboutColumns = useMemo(
    () => [
      { columnId: "landingAboutCol1", y: -500 },
      { columnId: "landingAboutCol2", y: -250 },
      { columnId: "landingAboutCol3", y: -250 },
      { columnId: "landingAboutCol4", y: -500 },
    ],
    [],
  );

  useGSAP(
    () => {
      if (!landingRootRef.current) return;
      if (!heroSectionRef.current) return;
      if (!heroHeaderRef.current) return;
      if (!heroCopyTextRef.current) return;
      if (!heroImageFrameRef.current) return;
      if (!aboutSectionRef.current) return;

      const heroScrollDistancePx = window.innerHeight * LANDING_SCROLL_MULTIPLIER;

      const { wordSpans: heroWordSpans, restore: restoreHeroCopy } =
        landingSplitTextIntoWordSpans(heroCopyTextRef.current);

      let isHeroCopyHidden = false;

      const heroScrollTrigger = ScrollTrigger.create({
        trigger: heroSectionRef.current,
        start: "top top",
        end: `+=${heroScrollDistancePx}px`,
        pin: true,
        pinSpacing: false,
        scrub: 1,
        onUpdate: (self) => {
          const scrollProgress = self.progress;

          const headerProgress = Math.min(scrollProgress / 0.29, 1);
          gsap.set(heroHeaderRef.current, { yPercent: -headerProgress * 100 });

          const wordsProgress = Math.max(
            0,
            Math.min((scrollProgress - 0.29) / 0.21, 1),
          );

          const totalWordCount = heroWordSpans.length;
          heroWordSpans.forEach((wordSpan, wordIndex) => {
            const wordStart = wordIndex / totalWordCount;
            const wordEnd = (wordIndex + 1) / totalWordCount;
            const wordOpacity = Math.max(
              0,
              Math.min((wordsProgress - wordStart) / (wordEnd - wordStart), 1),
            );
            gsap.set(wordSpan, { opacity: wordOpacity });
          });

          if (scrollProgress > 0.64 && !isHeroCopyHidden) {
            isHeroCopyHidden = true;
            gsap.to(heroCopyTextRef.current, { opacity: 0, duration: 0.2 });
          } else if (scrollProgress <= 0.64 && isHeroCopyHidden) {
            isHeroCopyHidden = false;
            gsap.to(heroCopyTextRef.current, { opacity: 1, duration: 0.2 });
          }

          const imageProgress = Math.max(
            0,
            Math.min((scrollProgress - 0.71) / 0.29, 1),
          );

          const imageWidthPx = gsap.utils.interpolate(
            window.innerWidth,
            150,
            imageProgress,
          );
          const imageHeightPx = gsap.utils.interpolate(
            window.innerHeight,
            150,
            imageProgress,
          );
          const imageBorderRadiusPx = gsap.utils.interpolate(0, 10, imageProgress);

          gsap.set(heroImageFrameRef.current, {
            width: imageWidthPx,
            height: imageHeightPx,
            borderRadius: imageBorderRadiusPx,
          });
        },
      });

      const aboutScrollTriggers = landingAboutColumns.map(({ columnId, y }) => {
        const columnEl = landingRootRef.current.querySelector(
          `[data-landing-about-col="${columnId}"]`,
        );
        if (!columnEl) return null;
        return gsap.to(columnEl, {
          y,
          scrollTrigger: {
            trigger: aboutSectionRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      return () => {
        heroScrollTrigger.kill();
        restoreHeroCopy();
        aboutScrollTriggers.forEach((tween) => {
          if (!tween) return;
          const trigger = tween.scrollTrigger;
          if (trigger) trigger.kill();
          tween.kill();
        });
      };
    },
    { scope: landingRootRef },
  );

  return (
    <Lenis root options={{ lerp: 0.1, duration: 1.5, smoothWheel: true }}>
      <div className={styles.landingRoot} ref={landingRootRef}>
        <section className={styles.landingSection} ref={heroSectionRef}>
          <div className={styles.landingHeroImg} ref={heroImageFrameRef}>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster="/landing/hero.jpg"
              aria-label="Hero background video"
            >
            <source src="/landing/Trapstar London ΓÇö Streetwear That Defines the Game.mp4" type="video/mp4" />
            </video>
            <div className={styles.landingHeroOverlay} />
          </div>

          <div className={styles.landingHeroHeader} ref={heroHeaderRef}>
            <h1>Inspired By You, To Inspire You</h1>
          </div>

          <div className={styles.landingHeroCopy}>
            <h3 ref={heroCopyTextRef}>
              Every Thread Carries a Memory.<br />
              Every Stitch Weaves a Story. <br />
              Fashion Was Never Meant to Follow Rules, <br />
              But to Break Them. <br />
              It&apos;s Freedom.
            </h3>
          </div>
        </section>

        <section
          className={[styles.landingSection, styles.landingAbout].join(" ")}
          ref={aboutSectionRef}
        >
          <div className={styles.landingAboutImages}>
            <div
              className={styles.landingAboutImgsCol}
              data-landing-about-col="landingAboutCol1"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className={styles.landingAboutImgsColItem} key={`c1-${idx}`}>
                  <Image
                    src={
                      [
                        "/landing/artist.png",
                        "/landing/football.png",
                        "/landing/graffiti.png",
                        "/landing/hero.jpg",
                      ][idx % 4]
                    }
                    alt={`About Image ${idx + 1}`}
                    fill
                    sizes="(max-width: 768px) 65px, 150px"
                    className={styles.landingAboutImg}
                  />
                </div>
              ))}
            </div>
            <div
              className={styles.landingAboutImgsCol}
              data-landing-about-col="landingAboutCol2"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className={styles.landingAboutImgsColItem} key={`c2-${idx}`}>
                  <Image
                    src={
                      [
                        "/landing/skate.png",
                        "/landing/studio.png",
                        "/landing/worker.png",
                        "/landing/artist.png",
                      ][idx % 4]
                    }
                    alt={`About Image ${idx + 5}`}
                    fill
                    sizes="(max-width: 768px) 65px, 150px"
                    className={styles.landingAboutImg}
                  />
                </div>
              ))}
            </div>
            <div
              className={styles.landingAboutImgsCol}
              data-landing-about-col="landingAboutCol3"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className={styles.landingAboutImgsColItem} key={`c3-${idx}`}>
                  <Image
                    src={
                      [
                        "/landing/football.png",
                        "/landing/graffiti.png",
                        "/landing/hero.jpg",
                        "/landing/studio.png",
                      ][idx % 4]
                    }
                    alt={`About Image ${idx + 9}`}
                    fill
                    sizes="(max-width: 768px) 65px, 150px"
                    className={styles.landingAboutImg}
                  />
                </div>
              ))}
            </div>
            <div
              className={styles.landingAboutImgsCol}
              data-landing-about-col="landingAboutCol4"
            >
              {Array.from({ length: 4 }).map((_, idx) => (
                <div className={styles.landingAboutImgsColItem} key={`c4-${idx}`}>
                  <Image
                    src={
                      [
                        "/landing/worker.png",
                        "/landing/skate.png",
                        "/landing/artist.png",
                        "/landing/football.png",
                      ][idx % 4]
                    }
                    alt={`About Image ${idx + 13}`}
                    fill
                    sizes="(max-width: 768px) 65px, 150px"
                    className={styles.landingAboutImg}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.landingAboutCta}>
            <button type="button" className={styles.landingShopNowBtn}>
              Shop Now
            </button>
          </div>
        </section>

        <section className={[styles.landingSection, styles.landingOutro].join(" ")}>
          <h3 align="left">
            In A World That Never Sleeps,
            <br />
            Streets Are Connected By The Threads,
            <br />
            That Thread Weaves Your Story,
            <br />
            Wear Your Story With Pride.           
          </h3>
        </section>
      </div>
    </Lenis>
  );
}

