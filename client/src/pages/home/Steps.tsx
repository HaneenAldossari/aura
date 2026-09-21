import { Camera, Palette, ScanFace } from "lucide-react";
import { useT } from "../../i18n";
import { STEPS_ID } from "./anchors";

export default function Steps() {
  const t = useT();

  const steps = [
    { n: "01", Icon: Camera, title: t("home.landing.step1Title"), body: t("home.landing.step1Body") },
    { n: "02", Icon: ScanFace, title: t("home.landing.step2Title"), body: t("home.landing.step2Body") },
    { n: "03", Icon: Palette, title: t("home.landing.step3Title"), body: t("home.landing.step3Body") },
  ];

  return (
    <section className="lp-section" id={STEPS_ID} aria-labelledby="lp-steps-title">
      <div className="lp-shell">
        <h2 className="lp-h2" id="lp-steps-title">
          {t("home.landing.stepsLead")} <em>{t("home.landing.stepsAccent")}</em>
        </h2>

        <ol className="lp-steps">
          {steps.map(({ n, Icon, title, body }, i) => (
            // The numeral is drawn from data-n by CSS: it is decoration at 12%
            // opacity, and as real text it fails a contrast check it was never
            // meant to pass. The <ol> already carries the order.
            <li className="lp-step lp-rise" key={n} data-n={n} style={{ ["--d" as string]: `${i * 0.15}s` }}>
              <Icon className="lp-step__icon" size={20} strokeWidth={1.5} aria-hidden="true" />
              <h3 className="lp-step__title">{title}</h3>
              <p className="lp-step__body">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
