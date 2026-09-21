import { useT } from "../../i18n";
import type { MeasuredSummary } from "../../lib/types";

/**
 * The measurement, shown as measured.
 *
 * CIE LCh, not Lab — the design's table is L/C/h and those are the numbers a
 * reader can act on. Mono and unstyled on purpose: this is the receipt for the
 * verdict above it, and dressing it up would undercut the point.
 *
 * Hair and eyes are nullable. A missing region prints "not measured" rather
 * than a zero, which would read as a real reading of black.
 */
export default function MeasuredTable({ measured }: { measured: MeasuredSummary }) {
  const t = useT();
  const rows = [
    { key: "skin", label: t("results.dna.skin"), reading: measured.skin },
    { key: "hair", label: t("results.dna.hair"), reading: measured.hair },
    { key: "eyes", label: t("results.dna.eyes"), reading: measured.eyes },
  ];

  return (
    <table className="ed-measured">
      <caption className="sr-only">{t("results.dna.tableCaption")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("results.dna.measured")}</th>
          <th scope="col" className="ltr-run">L</th>
          <th scope="col" className="ltr-run">C</th>
          <th scope="col" className="ltr-run">h</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            {row.reading ? (
              <>
                <td className="ltr-run">{row.reading.L.toFixed(1)}</td>
                <td className="ltr-run">{row.reading.C.toFixed(1)}</td>
                <td className="ltr-run">{row.reading.h.toFixed(1)}</td>
              </>
            ) : (
              <td colSpan={3}>{t("results.dna.notMeasured")}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
