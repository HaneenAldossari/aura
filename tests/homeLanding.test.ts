/**
 * Home sells the product with the colours the product delivers.
 *
 * The landing page came from a design whose season cards carried invented
 * swatches, two seasons that do not exist ("Warm Autumn", "Cool Winter") and
 * mock-up counts. These hold the port to canonical data: twelve cards, the
 * twelve canonical names, every hex straight out of getCanonicalPalette, and
 * no colour literal in any Home component for a second copy to grow from.
 *
 * The same assertion runs against the rendered DOM in scripts/dev/_home.ts.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { marqueeSeasons, previewSeason, PREVIEW_SEASON } from "../client/src/pages/home/seasonData";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";
import { getCanonicalPalette } from "../server/utils/seasonPalettes";
import { getSeasonMakeup } from "../server/utils/seasonMakeup";
import STYLE, { getSeasonStyle, seasonDescriptor } from "../server/utils/seasonStyle";
import { en } from "../client/src/i18n/en";

const HOME = path.join(__dirname, "../client/src/pages/home");
const read = (file: string) => fs.readFileSync(path.join(HOME, file), "utf8");

describe("season marquee", () => {
  const cards = marqueeSeasons();

  it("has exactly twelve cards, the canonical seasons in canonical order", () => {
    expect(cards.map((c) => c.name)).toEqual([...CANONICAL_SEASONS]);
  });

  it("never shows a season this system does not have", () => {
    const names = cards.map((c) => c.name as string);
    for (const ghost of ["Warm Autumn", "Cool Winter", "Soft Spring", "Light Autumn"]) {
      expect(names).not.toContain(ghost);
    }
  });

  it("shows twelve colours per card, and every hex matches getCanonicalPalette", () => {
    for (const card of cards) {
      const canonical = getCanonicalPalette(card.name);
      expect(canonical, card.name).not.toBeNull();
      expect(card.colours, card.name).toHaveLength(12);
      expect(card.colours.map((c) => c.hex)).toEqual(canonical!.best.map((c) => c.hex));
      expect(card.colours.map((c) => c.name)).toEqual(canonical!.best.map((c) => c.name));
    }
  });

  it("renders the hex it was given, and keeps a clone out of the accessible count", () => {
    const src = read("SeasonMarquee.tsx");
    expect(src).toMatch(/data-hex=\{colour\.hex\}/);
    expect(src).toMatch(/background: colour\.hex/);
    expect(src).toMatch(/aria-hidden=\{clone \|\| undefined\}/);
  });
});

describe("season descriptors", () => {
  it("every story opens claim — traits, which is what the descriptor is cut from", () => {
    for (const [season, style] of Object.entries(STYLE)) {
      const first = style.story.split(/(?<=[.!?])\s+/)[0];
      expect(first.split(" — "), season).toHaveLength(2);
    }
  });

  it("gives every canonical season one short line from its own story", () => {
    for (const season of CANONICAL_SEASONS) {
      const line = seasonDescriptor(season);
      expect(line.length, season).toBeGreaterThan(10);
      expect(line.length, season).toBeLessThanOrEqual(64);
      expect(line[0]).toBe(line[0].toUpperCase());
      expect(getSeasonStyle(season)!.story.toLowerCase()).toContain(line.toLowerCase());
    }
  });

  it("is empty rather than invented for a season that does not exist", () => {
    expect(seasonDescriptor("Soft Spring")).toBe("");
  });
});

describe("what you get", () => {
  it("previews one real season from the three canonical modules", () => {
    const preview = previewSeason();
    expect(CANONICAL_SEASONS).toContain(PREVIEW_SEASON);
    expect(preview.palette).toBe(getCanonicalPalette(PREVIEW_SEASON));
    expect(preview.makeup).toBe(getSeasonMakeup(PREVIEW_SEASON));
    expect(preview.style).toBe(getSeasonStyle(PREVIEW_SEASON));
  });
});

describe("no second copy of a colour", () => {
  it.each(["Hero.tsx", "SeasonMarquee.tsx", "Steps.tsx", "WhatYouGet.tsx", "ClosingCta.tsx", "seasonData.ts"])(
    "%s contains no hex literal",
    (file) => {
      expect(read(file)).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    },
  );

  it("the stylesheet declares no colour of its own", () => {
    // Tokens only. The one rgb() is black, for a shadow and a hairline.
    expect(read("home-landing.css")).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("copy", () => {
  const landing = JSON.stringify(en.home.landing);

  it("names no nail brand and makes no invented count", () => {
    expect(landing).not.toMatch(/OPI|Essie/i);
    expect(landing).not.toMatch(/\b27\b|\b24 curated\b/);
  });

  it("is in British spelling", () => {
    expect(landing).not.toMatch(/\bcolors?\b|\bjewelry\b|\bcoloring\b|\banalyze\b/i);
  });

  it("carries the agreed lines verbatim", () => {
    const { landing: l, privacy } = en.home;
    expect([l.trust1, l.trust2, l.trust3].join(" · ")).toBe(
      "Measured in your browser · 12 seasons · Nothing uploads until your photo passes.",
    );
    expect(l.step2Body).toBe(
      "Skin, hair and eyes are measured in CIE Lab and matched against the twelve seasons.",
    );
    expect(l.f7Body).toBe(
      "Photograph anything you're about to buy and get a score against your palette.",
    );
    expect(privacy).toBe("Your photo is checked on your device; nothing uploads until it passes.");
  });
});

describe("motion budget", () => {
  const css = read("home-landing.css");
  const home = fs.readFileSync(path.join(HOME, "../Home.tsx"), "utf8");

  it("has one ambient effect: no starfield, no shimmer, no pulsing glow", () => {
    expect(home).not.toMatch(/StarField/);
    expect(css).not.toMatch(/@keyframes\s+(shimmer|glow-pulse|scroll-pulse|twinkle)/);
    expect([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]).sort()).toEqual(["lp-belt", "lp-rise"]);
  });

  it("reduced motion stops the entrance and the belt, and mounts no canvas or clone", () => {
    const block = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).toMatch(/\.lp-rise,[\s\S]*\.lp-marquee__belt \{ animation: none; \}/);
    expect(read("Hero.tsx")).toMatch(/\{!reduced && <HeroParticles \/>\}/);
    expect(read("SeasonMarquee.tsx")).toMatch(/\{!reduced && seasons\.map/);
    expect(read("SeasonMarquee.tsx")).toMatch(/data-static=\{reduced \|\| undefined\}/);
  });

  it("the belt pauses under a pointer, a finger and keyboard focus", () => {
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.lp-marquee__window:hover \.lp-marquee__belt \{ animation-play-state: paused; \}/);
    expect(css).toMatch(/\.lp-marquee__window\[data-held\] \.lp-marquee__belt/);
    expect(read("SeasonMarquee.tsx")).toMatch(/onTouchStart=\{\(\) => setHeld\(true\)\}/);
  });
});
