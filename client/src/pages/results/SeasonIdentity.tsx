import { useState } from "react";
import { useT } from "../../i18n";

/**
 * The answer, and the one entrance in the app.
 *
 * The name rises 8px once per analysis — claimed through sessionStorage and
 * read-and-written in the same call so strict mode cannot hand it out twice.
 * prefers-reduced-motion collapses it through the global rule in index.css.
 */
function claimEntrance(sessionId?: string): boolean {
  if (!sessionId || typeof sessionStorage === "undefined") return true;
  const key = `aura:hero-seen:${sessionId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

export default function SeasonIdentity({
  seasonName,
  confidence,
  secondarySeason,
  tagline,
  sessionId,
}: {
  seasonName: string;
  confidence: number | null;
  secondarySeason?: string;
  tagline?: string;
  sessionId?: string;
}) {
  const t = useT();
  const [playEntrance] = useState(() => claimEntrance(sessionId));

  return (
    <div>
      <h1 className={`ed-season${playEntrance ? " hero-name-enter" : ""}`}>
        {seasonName.split(" ").map((word) => (
          <span key={word} className="ed-season__word">
            {word}
          </span>
        ))}
      </h1>

      <p className="ed-confidence">
        <span className="ed-confidence__tick" aria-hidden />
        {confidence !== null && (
          <span className="ed-confidence__value">
            {t("results.confidence", { percent: confidence })}
          </span>
        )}
        {secondarySeason && (
          <span className="ed-confidence__next">
            {t("results.nextClosest", { season: secondarySeason })}
          </span>
        )}
      </p>

      {tagline && <p className="ed-tagline">{tagline}</p>}
    </div>
  );
}
