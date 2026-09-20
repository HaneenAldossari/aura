import { useT } from "../../i18n";
import type { AnalysisResult } from "../../lib/types";
import type { ResultsTab } from "./ResultsTabs";

/**
 * Three cards saying what is behind the other tabs.
 *
 * A tab bar tells you a tab exists; it does not tell you whether it is worth
 * opening. Each preview is drawn from this season's own canonical data, so it
 * is a sample of the contents rather than a description of the category.
 */
export default function PreviewCards({
  data,
  onOpen,
}: {
  data: AnalysisResult;
  onOpen: (tab: ResultsTab) => void;
}) {
  const t = useT();
  const makeup = data.makeupShades;
  const style = data.styleShades;

  const names = (shades: { name: string }[] | undefined, n: number) =>
    (shades ?? []).slice(0, n).map((s) => s.name.toLowerCase()).join(", ");

  const cards: { tab: ResultsTab; title: string; preview: string }[] = [];

  if (makeup) {
    cards.push({
      tab: "beauty",
      title: t("results.tabBeauty"),
      preview: [
        makeup.foundation[Math.floor(makeup.foundation.length / 2)]?.name.toLowerCase(),
        names(makeup.blush, 1),
        names(makeup.lip, 1),
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  if (style) {
    const bestMetal = style.metals.find((m) => m.verdict === "best")?.name.toLowerCase();
    cards.push({
      tab: "style",
      title: t("results.tabStyle"),
      preview: [bestMetal, names(style.hair, 1)].filter(Boolean).join(", "),
    });
  }

  cards.push({
    tab: "shop",
    title: t("results.tabShop"),
    preview: t("results.previews.shop"),
  });

  return (
    <div className="ed-previews">
      {cards.map((card) => (
        <button
          type="button"
          className="ed-preview"
          key={card.tab}
          onClick={() => onOpen(card.tab)}
        >
          <span className="ed-preview__title">{card.title}</span>
          <span className="ed-preview__text">{card.preview}</span>
          <span className="ed-preview__cta" aria-hidden>→</span>
        </button>
      ))}
    </div>
  );
}
