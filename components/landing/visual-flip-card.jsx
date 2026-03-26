"use client";

import Image from "next/image";
import { forwardRef } from "react";
import styles from "@styles/visual.module.css";

const VisualFlipCard = forwardRef(function VisualFlipCard(
  { visualCardId, visualFrontSrc, visualFrontAlt, visualBackText },
  visualRef,
) {
  return (
    <div className={styles.visualCard} id={visualCardId} ref={visualRef}>
      <div className={styles.visualCardWrapper}>
        <div className={styles.visualFlipInner}>
          <div className={styles.visualFlipFace} data-visual-face="front">
            <Image
              src={visualFrontSrc}
              alt={visualFrontAlt}
              width={500}
              height={500}
              priority={false}
            />
          </div>
          <div
            className={[styles.visualFlipFace, styles.visualFlipBack].join(" ")}
            data-visual-face="back"
          >
            <p className={styles.visualCardText}>{visualBackText}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default VisualFlipCard;

