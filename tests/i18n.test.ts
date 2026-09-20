/**
 * The i18n scaffold's own guarantees.
 *
 * Two of these are worth more than the rest: that every key a component asks
 * for actually resolves (a typo would otherwise ship as the key text), and that
 * the Arabic catalogue cannot contain a key the English one does not — which
 * would mean a translated string no screen will ever read.
 */

import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { en } from "../client/src/i18n/en";
import { ar } from "../client/src/i18n/ar";

const SRC = path.join(__dirname, "../client/src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return walk(full);
    return /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

/** Every dotted path in a catalogue that ends at a string. */
function paths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k)
  );
}

const enPaths = new Set(paths(en));
const files = walk(SRC).filter((f) => !f.includes(`${path.sep}i18n${path.sep}`));

describe("catalogue", () => {
  it("has strings", () => {
    expect(enPaths.size).toBeGreaterThan(150);
  });

  it("holds no American spellings in user-facing copy", () => {
    // Deliberate exceptions: a book title is a proper name, and colorDNA is a
    // field name on the API response rather than prose.
    const allowed = /Color Me Beautiful/;
    const american =
      /\b(colors?|colored|coloring|analyze[ds]?|analyzing|personalized|popularized|harmonize[sd]?|jewelry|gray|favorite|neutralize[sd]?|emphasize[sd]?|fiber)\b/i;
    const offenders = [...enPaths].filter((p) => {
      const value = p.split(".").reduce<any>((n, k) => n?.[k], en) as string;
      return american.test(value.replace(allowed, ""));
    });
    expect(offenders).toEqual([]);
  });

  it("gives Arabic no key English does not have", () => {
    const orphans = paths(ar).filter((p) => !enPaths.has(p));
    expect(orphans).toEqual([]);
  });

  it("keeps the same {placeholders} in both locales", () => {
    const slots = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    const mismatched = paths(ar).filter((p) => {
      const get = (root: unknown) =>
        p.split(".").reduce<any>((n, k) => n?.[k], root) as string | undefined;
      const a = get(ar);
      const e = get(en);
      return typeof a === "string" && typeof e === "string" && slots(a) !== slots(e);
    });
    expect(mismatched).toEqual([]);
  });
});

describe("call sites", () => {
  /**
   * Literal t("…") calls across the app. Keys built by template — the two
   * `home.whatYouGet.${key}Title` lists — are checked separately below,
   * because a regex cannot resolve them.
   */
  const used = new Map<string, string>();
  for (const file of files) {
    const body = fs.readFileSync(file, "utf8");
    for (const m of body.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]/g)) {
      used.set(m[1], path.relative(SRC, file));
    }
    // Keys stored in tables and passed to t() indirectly (labelKey, captionKey…).
    for (const m of body.matchAll(/(?:Key|key):\s*["']([a-z][\w]*(?:\.[\w]+)+)["']/g)) {
      used.set(m[1], path.relative(SRC, file));
    }
  }

  it("finds call sites at all", () => {
    expect(used.size).toBeGreaterThan(100);
  });

  it("resolves every key a component asks for", () => {
    const missing = [...used].filter(([key]) => !enPaths.has(key));
    expect(missing.map(([k, f]) => `${k} (${f})`)).toEqual([]);
  });

  it("resolves the two template-built key families", () => {
    for (const k of ["season", "palette", "beauty", "nails", "metals", "check"]) {
      expect(enPaths.has(`home.whatYouGet.${k}Title`)).toBe(true);
      expect(enPaths.has(`home.whatYouGet.${k}Body`)).toBe(true);
    }
  });
});

describe("locale switching is off", () => {
  /**
   * The scaffold stays; selecting a locale does not.
   *
   * A half-translated Arabic UI laid out right-to-left is worse than an English
   * one — the English strings that fall back get rendered RTL, so punctuation
   * lands at the start of the line and the page reads as broken rather than as
   * untranslated. This pins that nothing at runtime can reach Arabic until the
   * copy and a visible toggle land together.
   */
  const source = fs.readFileSync(path.join(SRC, "i18n/index.tsx"), "utf8");

  it("has the flag off", () => {
    expect(source).toMatch(/LOCALE_SWITCHING_ENABLED = false/);
  });

  it("returns English without consulting storage, navigator or the query", () => {
    const detect = source.slice(source.indexOf("export function detectLocale"));
    const guard = detect.slice(0, detect.indexOf("\n}"));
    // The early return must come before any of the three inputs is read.
    const earlyReturn = guard.indexOf('return "en"');
    for (const input of ["localStorage.getItem", "navigator", "URLSearchParams"]) {
      const at = guard.indexOf(input);
      if (at !== -1) expect(at, input).toBeGreaterThan(earlyReturn);
    }
  });

  it("clears a locale stored before the toggle was hidden", () => {
    expect(source).toMatch(/forgetStoredLocale/);
    expect(source).toMatch(/localStorage\.removeItem\(STORAGE_KEY\)/);
  });

  it("makes setLocale inert", () => {
    expect(source).toMatch(/if \(!LOCALE_SWITCHING_ENABLED\) return;/);
  });

  it("keeps the Arabic catalogue and the RTL rules in place", () => {
    // Hidden, not deleted: the work already done must survive to step 8.
    expect(fs.existsSync(path.join(SRC, "i18n/ar.ts"))).toBe(true);
    const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");
    expect(css).toMatch(/\[dir="rtl"\]/);
  });
});

describe("RTL", () => {
  const css = fs.readFileSync(path.join(SRC, "index.css"), "utf8");

  it("reverses the swatch band so 01 stays at the reading edge", () => {
    expect(css).toMatch(/\[dir="rtl"\][^{]*\.palette-band[\s\S]*?row-reverse/);
  });

  it("never letterspaces Arabic", () => {
    const block = css.match(/\[dir="rtl"\][\s\S]*?letter-spacing:\s*normal[^;]*;/)?.[0];
    expect(block).toBeTruthy();
    // Weight carries the emphasis that tracking carried in Latin.
    expect(css).toMatch(/letter-spacing:\s*normal\s*!important;\s*\n\s*font-weight:/);
  });

  it("isolates numbers, hex codes and IDs as LTR runs", () => {
    expect(css).toMatch(/\.ltr-run\s*\{[^}]*unicode-bidi:\s*isolate/);
    expect(css).toMatch(/\[dir="rtl"\][\s\S]*?\.ltr-run[\s\S]*?direction:\s*ltr/);
  });

  it("gives Arabic its own display, body and mono faces", () => {
    // Scoped to [dir="rtl"], not appended to the Latin stacks: font fallback
    // is chosen per glyph, so an Arabic face left in the Latin display stack
    // would pick up any character Bodoni happens to lack.
    const rtlBlock = css.match(/\[dir="rtl"\]\s*\{[^}]*\}/)?.[0] ?? "";
    expect(rtlBlock).toMatch(/--font-display:\s*Amiri/);
    expect(rtlBlock).toMatch(/--font-body:[^;]*IBM Plex Sans Arabic/);
    expect(rtlBlock).toMatch(/--font-mono:[^;]*Arabic/);
  });

  it("loads the Arabic faces", () => {
    const html = fs.readFileSync(path.join(SRC, "../index.html"), "utf8");
    expect(html).toMatch(/family=Amiri/);
    expect(html).toMatch(/family=IBM\+Plex\+Sans\+Arabic/);
  });

  it("loosens display leading for Arabic", () => {
    // Bodoni's tight display leading reads as cramped in a script with no
    // ascender/descender rhythm to hang on.
    expect(css).toMatch(/\[dir="rtl"\][^{]*\.ed-season[\s\S]{0,160}line-height/);
  });

  it("leaves no physical left/right box properties behind", () => {
    const offenders: string[] = [];
    for (const file of [...walk(SRC).filter((f) => /\.css$/.test(f))]) {
      const body = fs.readFileSync(file, "utf8");
      // `left`/`right` as insets are still allowed where they are symmetric or
      // paired with a transform; margin/padding/border sides are not.
      if (/(margin|padding|border)-(left|right)\s*:/.test(body)) {
        offenders.push(path.relative(SRC, file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it("leaves no physical left/right inline styles behind", () => {
    const offenders = files.filter((f) =>
      /(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft|borderRight)\s*:/.test(
        fs.readFileSync(f, "utf8")
      )
    );
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });
});
