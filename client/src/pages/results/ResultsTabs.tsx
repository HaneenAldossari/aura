import { useT, type Key } from "../../i18n";

export type ResultsTab = "overview" | "beauty" | "style" | "shop";

const TABS: { id: ResultsTab; labelKey: Key }[] = [
  { id: "overview", labelKey: "results.tabOverview" },
  { id: "beauty", labelKey: "results.tabBeauty" },
  { id: "style", labelKey: "results.tabStyle" },
  { id: "shop", labelKey: "results.tabShop" },
];

/**
 * Text links on a rule — no pills, no sliding indicator.
 *
 * The rule is the whole chrome: the active tab is the one whose label is ink
 * with a gold underline sitting on that rule. Anything heavier competes with
 * the palette, which is the only thing on these screens allowed to be loud.
 */
export default function ResultsTabs({
  active,
  onChange,
}: {
  active: ResultsTab;
  onChange: (tab: ResultsTab) => void;
}) {
  const t = useT();

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : TABS.length - 1;
    const next = TABS[(index + step) % TABS.length];
    onChange(next.id);
    (
      e.currentTarget.parentElement?.querySelector(
        `[data-tab="${next.id}"]`
      ) as HTMLButtonElement | null
    )?.focus();
  };

  return (
    <div className="ed-tabs" role="tablist" aria-label={t("results.sectionsLabel")}>
      {TABS.map((tab, i) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          data-tab={tab.id}
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          className={`ed-tab${active === tab.id ? " ed-tab--on" : ""}`}
          onClick={() => onChange(tab.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
}
