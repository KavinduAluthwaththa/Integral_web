"use client";

import dynamic from "next/dynamic";
import LandingLandingPage from "./landing-page";

const VisualScrollCards = dynamic(() => import("./visual-scroll-cards"), {
  ssr: false,
  loading: () => null,
});

export default function HomeCombined() {
  return (
    <main>
      <LandingLandingPage />
      <VisualScrollCards />
    </main>
  );
}
