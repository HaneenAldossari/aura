import Footer from "../components/Footer";
import ClosingCta from "./home/ClosingCta";
import Hero from "./home/Hero";
import ParticleField from "./home/ParticleField";
import SeasonMarquee from "./home/SeasonMarquee";
import Steps from "./home/Steps";
import WhatYouGet from "./home/WhatYouGet";
import { useReducedMotion } from "../lib/useReducedMotion";
import "./home/home-landing.css";

/**
 * The landing page: claim, evidence, method, deliverables, ask.
 *
 * The marquee sits directly under the hero on purpose. The hero says the
 * colours exist; the very next thing on the page is all hundred and forty-four
 * of them, read from the module an analysis injects from.
 *
 * Motion is budgeted in home-landing.css: one ambient effect (the particle
 * field, fixed behind every section), the marquee, and a mount entrance.
 * Reduced motion turns off all three — the field is not even mounted.
 */
export default function Home() {
  const reduced = useReducedMotion();

  return (
    <main id="home" className="lp-page">
      {!reduced && <ParticleField />}
      <Hero />
      <SeasonMarquee />
      <Steps />
      <WhatYouGet />
      <ClosingCta />
      <Footer />
    </main>
  );
}
