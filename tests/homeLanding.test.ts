/**
 * Home sells the product with the colours the product delivers.
 *
 * The landing page came from a design whose season cards carried invented
 * swatches, two seasons that do not exist ("Warm Autumn", "Cool Winter") and
 * mock-up counts. These hold the port to canonical data: twelve cards, the
 * twelve canonical names, every hex straight out of getCanonicalPalette, and
 * no colour literal in any Home component for a second copy to grow from.
 *
 * The same assertion runs against the rendered DOM in scripts/dev/home.ts.
 */
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { marqueeSeasons } from "../client/src/pages/home/seasonData";
import { CANONICAL_SEASONS } from "../server/prompts/colorAnalysis";
import { getCanonicalPalette, HERO_SIX, heroSix } from "../server/utils/seasonPalettes";
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

  it("shows six colours per card, and every hex matches getCanonicalPalette", () => {
    for (const card of cards) {
      const canonical = getCanonicalPalette(card.name);
      expect(canonical, card.name).not.toBeNull();
      expect(card.colours, card.name).toHaveLength(6);
      for (const colour of card.colours) {
        const source = canonical!.best.find((c) => c.name === colour.name);
        expect(source, `${card.name}: ${colour.name}`).toBeDefined();
        expect(colour.hex).toBe(source!.hex);
      }
    }
  });

  it("curates each six as light neutral, four colours, dark neutral", () => {
    expect(Object.keys(HERO_SIX).sort()).toEqual(CANONICAL_SEASONS.map((s) => s.toLowerCase()).sort());
    for (const season of CANONICAL_SEASONS) {
      const six = heroSix(season);
      const neutrals = new Set(getCanonicalPalette(season)!.neutrals.map((c) => c.name));
      expect(new Set(six.map((c) => c.name)).size, season).toBe(6);
      expect(neutrals.has(six[0].name), `${season}: ${six[0].name} opens as a neutral`).toBe(true);
      expect(neutrals.has(six[5].name), `${season}: ${six[5].name} closes as a neutral`).toBe(true);
      for (const colour of six.slice(1, 5)) {
        expect(neutrals.has(colour.name), `${season}: ${colour.name} is a colour, not a neutral`).toBe(false);
      }
      // Light first, dark last: the row reads left to right as a value scale at its ends.
      const luma = (hex: string) => parseInt(hex.slice(1, 3), 16) * 0.2126 + parseInt(hex.slice(3, 5), 16) * 0.7152 + parseInt(hex.slice(5, 7), 16) * 0.0722;
      expect(luma(six[0].hex), season).toBeGreaterThan(luma(six[5].hex));
    }
  });

  it("has no six for a season this system does not have", () => {
    expect(heroSix("Soft Spring")).toEqual([]);
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
  const src = read("WhatYouGet.tsx");
  const manifest = JSON.parse(read("previews.json")) as {
    season: string;
    tabs: Record<string, { src: string; width: number; height: number }>;
  };

  it("has exactly four rows, the app's four tabs, in tab order", () => {
    const ids = [...src.matchAll(/\{ id: "([\w-]+)", title:/g)].map((m) => m[1]);
    expect(ids).toEqual(["overview", "beauty", "style", "before-you-buy"]);
    const l = en.home.landing;
    expect([l.row1Title, l.row2Title, l.row3Title, l.row4Title]).toEqual([
      "Your Season & Palette", "Beauty Guide", "Style", "Before You Buy",
    ]);
  });

  it("says each in one sentence", () => {
    const l = en.home.landing;
    for (const body of [l.row1Body, l.row2Body, l.row3Body, l.row4Body]) {
      expect(body.match(/[.!?]/g)?.length, body).toBe(1);
    }
  });

  it("previews each with a published capture of the real tab, for a canonical season", () => {
    expect(CANONICAL_SEASONS).toContain(manifest.season);
    for (const id of ["overview", "beauty", "style", "before-you-buy"]) {
      const shot = manifest.tabs[id];
      expect(shot, id).toBeDefined();
      expect(fs.existsSync(path.join(__dirname, "../client/public", shot.src)), shot.src).toBe(true);
      expect(shot.width).toBeGreaterThan(0);
      expect(shot.height).toBeGreaterThan(0);
    }
  });

  it("draws nothing of its own: no canonical data, no swatches, just the capture", () => {
    expect(src).not.toMatch(/seasonPalettes|seasonMakeup|seasonStyle|style=\{\{ background/);
    expect(src).toMatch(/<img/);
  });
});

describe("no second copy of a colour", () => {
  it.each(["Hero.tsx", "SeasonMarquee.tsx", "Steps.tsx", "WhatYouGet.tsx", "ClosingCta.tsx", "ParticleField.tsx", "seasonData.ts"])(
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
    expect(JSON.stringify(en.results.chat)).not.toMatch(/OPI|Essie|MAC\b|Charlotte Tilbury|Moonglaze|Ruby Woo|Pillow Talk/i);
  });

  it("is in British spelling", () => {
    expect(landing).not.toMatch(/\bcolors?\b|\bjewelry\b|\bcoloring\b|\banalyze\b/i);
  });

  it("carries the agreed lines verbatim", () => {
    const { landing: l, privacy } = en.home;
    expect(l.step2Body).toBe(
      "Skin, hair and eyes are measured in CIE Lab and matched against the twelve seasons.",
    );
    expect(l.row4Body).toBe(
      "Photograph anything you're about to buy and get a score against your palette.",
    );
    expect(privacy).toBe("Your photo is checked on your device; nothing uploads until it passes.");
    expect(en.common.tagline).toBe("Personal colour analysis");
  });

  it("says the privacy line once: the dotted trust row that repeated it is gone", () => {
    expect(landing).not.toMatch(/Nothing uploads until your photo passes/);
    expect(read("Hero.tsx")).not.toMatch(/lp-trust/);
    expect(read("Hero.tsx").match(/home\.privacy/g)).toHaveLength(1);
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
    expect(home).toMatch(/\{!reduced && <ParticleField \/>\}/);
    expect(read("SeasonMarquee.tsx")).toMatch(/\{!reduced && seasons\.map/);
    expect(read("SeasonMarquee.tsx")).toMatch(/data-static=\{reduced \|\| undefined\}/);
  });

  it("the particle field is fixed behind every section, and stops when the tab is hidden", () => {
    expect(css).toMatch(/\.lp-particles \{\s*position: fixed;\s*inset: 0;\s*z-index: 0;/);
    expect(css).toMatch(/\.lp-hero,\s*\.lp-section,\s*#home > footer \{ position: relative; z-index: 1; \}/);
    const field = read("ParticleField.tsx");
    expect(field).toMatch(/if \(!document\.hidden\) frame = requestAnimationFrame\(draw\)/);
    expect(field).toMatch(/addEventListener\("visibilitychange", sync\)/);
  });

  it("no section lays an opaque fill over it: overlays stay within 8% lightness of the ground", () => {
    // Sections only. Cards inside them are content surfaces and may be solid.
    const sectionRules = [...css.matchAll(/\.(lp-section(?:--raised)?|lp-hero|lp-close|lp-marquee) \{([^}]*)\}/g)];
    for (const [, name, body] of sectionRules) {
      expect(body, name).not.toMatch(/background:\s*var\(--(surface|surface-raised|ground)\)/);
    }
    const veil = css.match(/\.lp-section--raised \{ background: color-mix\(in srgb, var\(--ink\) (\d+)%, transparent\); \}/);
    expect(veil).not.toBeNull();
    // --ink (#F3EDE4, L 92.5%) at a% over --ground (#0C0A09, L 4.1%) lifts lightness by a% of the gap.
    const lift = (Number(veil![1]) / 100) * (92.5 - 4.1);
    expect(lift).toBeLessThanOrEqual(8);
  });

  it("the phone hero is the primary button and the sample link only", () => {
    expect(read("Hero.tsx")).toMatch(/className="cta cta--secondary lp-hero__how"/);
    expect(css).toMatch(/@media \(max-width: 599px\) \{ \.lp-hero__how \{ display: none; \} \}/);
  });

  it("the belt pauses under a pointer, a finger and keyboard focus", () => {
    expect(css).toMatch(/@media \(hover: hover\) \{\s*\.lp-marquee__window:hover \.lp-marquee__belt \{ animation-play-state: paused; \}/);
    expect(css).toMatch(/\.lp-marquee__window\[data-held\] \.lp-marquee__belt/);
    expect(read("SeasonMarquee.tsx")).toMatch(/onTouchStart=\{\(\) => setHeld\(true\)\}/);
  });
});
