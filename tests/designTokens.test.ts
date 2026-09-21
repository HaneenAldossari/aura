import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The design system marks `ink muted` as "floor 4.5:1". This checks that claim
 * against the real token values rather than trusting the label, and covers
 * every text role the editorial direction actually uses.
 *
 * WCAG relative luminance, not CIE L* — they are different curves, and the
 * accessibility threshold is defined on the former.
 */
const CSS = fs.readFileSync(path.join(__dirname, "../client/src/index.css"), "utf8");

function token(name: string): string {
  const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!match) throw new Error(`token --${name} not found in index.css`);
  return match[1];
}

function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("colour roles carry the editorial values", () => {
  it.each([
    ["ground", "#0C0A09"],
    ["surface", "#131110"],
    ["rule", "#26211C"],
    ["accent", "#C9A567"],
    ["ink", "#F3EDE4"],
    ["ink-secondary", "#C8C0B6"],
    ["ink-trust", "#B9B0A5"],
    ["ink-muted", "#8C8378"],
  ])("--%s is %s", (name, hex) => {
    expect(token(name).toUpperCase()).toBe(hex);
  });
});

describe("contrast floors", () => {
  const ground = "#0C0A09";
  const surface = "#131110";

  /** Body text and small labels must clear 4.5:1 — rule 8 of the sprint. */
  it.each([
    ["ink", 4.5],
    ["ink-secondary", 4.5],
    ["ink-trust", 4.5],
    ["ink-muted", 4.5],
  ])("--%s on the page ground clears %s:1", (name, floor) => {
    expect(contrast(token(name), ground)).toBeGreaterThanOrEqual(floor);
  });

  it("every text role clears 4.5:1 on inset panels too", () => {
    for (const name of ["ink", "ink-secondary", "ink-trust", "ink-muted"]) {
      expect(contrast(token(name), surface), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gold clears 4.5:1 as text, since it marks confidence and active state", () => {
    expect(contrast(token("accent"), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("text on a gold fill clears 4.5:1", () => {
    expect(contrast(token("on-accent"), token("accent"))).toBeGreaterThanOrEqual(4.5);
  });

  /**
   * The design's own note: at 45% the 13px season labels measure about 3:1, so
   * the ribbon dims palette bars only and shifts the name's colour instead.
   * This pins the reasoning — if it ever passed, the workaround is unnecessary.
   */
  it("confirms why the ribbon does not dim its season names", () => {
    const dimmed = "#3F3B36"; // ink-muted at 45% over ground
    expect(contrast(dimmed, ground)).toBeLessThan(4.5);
    expect(contrast(token("accent"), ground)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("type scale", () => {
  it("never goes below 11px, at either width", () => {
    const sizes = [...CSS.matchAll(/--type-[a-z-]+:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(sizes.length).toBeGreaterThan(6);
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(11);
  });

  it("carries the three editorial families", () => {
    expect(CSS).toMatch(/--font-display:\s*"Cormorant Garamond"/);
    expect(CSS).toMatch(/--font-body:\s*Archivo/);
    expect(CSS).toMatch(/--font-mono:\s*"IBM Plex Mono"/);
  });

  it("includes an Arabic face in the body stack, ready for the RTL switch", () => {
    expect(CSS).toMatch(/IBM Plex Sans Arabic/);
  });
});

describe("safe-area insets exist for installed PWA mode", () => {
  it.each(["top", "bottom", "left", "right"])("--safe-%s reads env()", (side) => {
    expect(CSS).toMatch(new RegExp(`--safe-${side}:\\s*env\\(safe-area-inset-${side}`));
  });
});

/**
 * The design system permits exactly two pieces of ambient motion, both on Home:
 * StarField and the season ribbon. Everywhere else the interface holds still.
 * These pin the removals so they cannot creep back component by component.
 */
describe("banned decorative effects stay gone", () => {
  const srcDir = path.join(__dirname, "../client/src");

  function walk(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return walk(full);
      return /\.(tsx?|css)$/.test(e.name) ? [full] : [];
    });
  }

  const files = walk(srcDir);

  it.each([
    // The class, the hook and the component — not the English word, which
    // appears legitimately in body copy ("to reveal your palette").
    ["scroll reveal", /className=["'`][^"'`]*\breveal\b|useReveal|<Reveal[\s/>]/, /$^/],
    ["hover lift", /lift-hover/, /$^/],
    ["shimmer sweep", /shimmer-move|hero-shimmer|skeleton-sweep/, /$^/],
    ["parallax", /parallax/i, /$^/],
  ])("no %s anywhere in client/src", (_label, pattern, allow) => {
    const offenders = files.filter((f) => {
      if (allow.test(f)) return false;
      const body = fs.readFileSync(f, "utf8");
      // Comments explaining a removal are not a reintroduction.
      const code = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
      return pattern.test(code);
    });
    expect(offenders.map((f) => path.relative(srcDir, f))).toEqual([]);
  });

  /**
   * The season name on Results is the one sanctioned entrance. Pinned rather
   * than banned, because an exception with no boundary becomes the rule again:
   * these assert it exists, that it is the only one, and that it stayed plain.
   */
  it("allows exactly one entrance animation, on the season name", () => {
    const users = files.filter((f) =>
      /hero-name-enter/.test(fs.readFileSync(f, "utf8"))
    );
    expect(users.map((f) => path.relative(srcDir, f)).sort()).toEqual([
      "index.css",
      "pages/results/SeasonIdentity.tsx",
    ]);
  });

  it("the season-name entrance is a fade and a small rise, nothing more", () => {
    const css = fs.readFileSync(path.join(srcDir, "index.css"), "utf8");
    const frames = css.match(/@keyframes hero-name-rise\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(frames).toMatch(/opacity/);
    // A rise, not a slide: anything past ~12px reads as a title sequence.
    const rise = Number(frames.match(/translateY\((\d+)px\)/)?.[1] ?? 99);
    expect(rise).toBeLessThanOrEqual(12);
    expect(frames).not.toMatch(/gradient|background|filter|scale|rotate/);

    // One pass. An iteration count would make it ambient motion off Home.
    const rule = css.match(/\.hero-name-enter\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rule).not.toMatch(/infinite|alternate/);
    const ms = Number(rule.match(/(\d+)ms/)?.[1] ?? 0);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(500);
  });

  it("keeps 'shimmer' where it names a makeup finish, not an effect", () => {
    // The shade bars print `finish`, which is "shimmer" for real shades. That
    // is content from the canonical list, not decoration, and the ban above
    // must not take it with it.
    const makeup = fs.readFileSync(path.join(srcDir, "pages/results/MakeupSection.tsx"), "utf8");
    expect(makeup).toMatch(/ed-tile__sub/);
    expect(makeup).toMatch(/shade\.finish/);
    const data = fs.readFileSync(
      path.join(__dirname, "../server/utils/seasonMakeup.ts"),
      "utf8"
    );
    expect(data).toMatch(/"shimmer"/);
  });

  it("no hover rule moves an element or casts a shadow", () => {
    const css = fs.readFileSync(path.join(srcDir, "index.css"), "utf8");
    const hoverBlocks = [...css.matchAll(/:hover\s*\{([^}]*)\}/g)].map((m) => m[1]);
    for (const block of hoverBlocks) {
      expect(block).not.toMatch(/transform|box-shadow/);
    }
  });
});

/**
 * Type floors.
 *
 * Small type is the first thing that creeps back: a caption gets shrunk to fit
 * a row, then the next one matches it. These pin the floors rather than the
 * exact sizes, since the sizes are allowed to move and the floors are not.
 */
describe("type floors", () => {
  const src = path.join(__dirname, "../client/src");
  const collect = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return collect(full);
      return /\.(tsx?|css)$/.test(e.name) ? [full] : [];
    });
  const css = fs.readFileSync(path.join(src, "index.css"), "utf8");
  const files = collect(src);

  const tokenValue = (name: string, block = css) =>
    Number(block.match(new RegExp(`--${name}:\\s*(\\d+)px`))?.[1] ?? 0);

  it("sets body to 16 on desktop and 17 on phone", () => {
    expect(tokenValue("type-body")).toBe(16);
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"));
    expect(tokenValue("type-body", phone)).toBe(17);
  });

  it("holds guidance at 17 at both sizes", () => {
    expect(tokenValue("type-guide")).toBe(17);
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"));
    expect(tokenValue("type-guide", phone)).toBe(17);
  });

  it("keeps names at 14 and captions at 13, at both sizes", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 767px)"));
    for (const block of [css, phone]) {
      expect(tokenValue("type-label", block)).toBeGreaterThanOrEqual(14);
      expect(tokenValue("type-micro", block)).toBeGreaterThanOrEqual(13);
    }
  });

  it("has no stylesheet declaring a size below 13px", () => {
    const offenders: string[] = [];
    for (const file of files.filter((f) => f.endsWith(".css"))) {
      const body = fs.readFileSync(file, "utf8");
      for (const m of body.matchAll(/font-size:\s*(\d+)px/g)) {
        if (Number(m[1]) < 13) offenders.push(`${path.relative(src, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("has no inline style declaring a size below 13px", () => {
    const offenders: string[] = [];
    for (const file of files.filter((f) => f.endsWith(".tsx"))) {
      const body = fs.readFileSync(file, "utf8");
      for (const m of body.matchAll(/fontSize:\s*(\d+)\b/g)) {
        if (Number(m[1]) < 13) offenders.push(`${path.relative(src, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
