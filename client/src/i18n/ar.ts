/**
 * Arabic catalogue — partial by design.
 *
 * The sprint brief asks for the scaffold now and Arabic later. What is here is
 * the chrome: navigation, buttons, headings, short labels and the strings the
 * quality and system panels need. It exists so RTL is a thing that can be
 * tested and reviewed today rather than a promise — flip the locale and the
 * layout mirrors, the type renders in IBM Plex Sans Arabic, and the swatch band
 * reverses.
 *
 * Every key not present here falls back to English at runtime. That is visible
 * and deliberate: a half-translated screen shows exactly what is left to do,
 * where a machine-filled one hides it. The long prose — the poetry section, the
 * season story fallback, the chat greeting, the trivia — is left for a
 * translator, because it carries the voice and it is what would read wrong.
 *
 * Note for whoever finishes this: Arabic is never letterspaced. The design
 * system's Latin caps labels become weight, not tracking. See index.css,
 * [dir="rtl"] rules.
 */

import type { Catalogue, DeepPartial } from "./types";

export const ar: DeepPartial<Catalogue> = {
  common: {
    brandPrefix: "",
    brandName: "أورا",
    brandFull: "أورا",
    tagline: "تحليل الألوان الشخصي",
    seasonSystem: "نظام الفصول الاثني عشر",
    getStarted: "ابدئي الآن",
    back: "رجوع",
    close: "إغلاق",
    retry: "حاولي مرة أخرى",
    loading: "جارٍ التحميل",
    languageName: "العربية",
  },

  home: {
    eyebrow: "تحليل ألوان بالذكاء الاصطناعي",
    titleLine1: "اكتشفي الألوان",
    titleLine2Lead: "التي خُلقت",
    titleLine2Accent: "من أجلك",
    lede:
      "ارفعي صورة واحدة. تقرأ أورا درجة بشرتك الأساسية وعمقها وتباينها " +
      "لتكشف لوحة ألوان فصلك — ألوانك أنتِ، وبقواعدك أنتِ.",
    ctaPrimary: "اكتشفي لوحة ألوانك",
    ctaSecondary: "كيف يعمل",
    drape: {
      prompt: "أيٌّ منها يُضيء وجهك؟",
      spring: "الربيع يُنعشك.",
      summer: "الصيف يُلطّفك.",
      autumn: "الخريف يُدفئك.",
      winter: "الشتاء يُبرز ملامحك.",
    },
    journey: {
      eyebrow: "كيف يعمل",
      title: "طريق الاكتشاف",
      step1Title: "ارفعي الصورة",
      step2Title: "التحليل",
      step3Title: "الاكتشاف",
    },
    whatYouGet: {
      title: "ماذا ستحصلين عليه",
      seasonTitle: "فصلك",
      paletteTitle: "لوحة ألوانك",
      beautyTitle: "دليل الجمال",
      nailsTitle: "دليل الأظافر",
      metalsTitle: "المعادن والأحجار",
      checkTitle: "قبل الشراء",
    },
    carousel: { title: "أي فصل أنتِ؟" },
    poetry: { title: "الدقة تلتقي بالشعر" },
    cta: {
      title: "مستعدة للقاء ألوانك؟",
      body: "ارفعي صورة واحدة واكتشفي اللوحة التي كانت دائمًا لكِ.",
      button: "اكتشفي لوحة ألوانك",
    },
  },

  analysis: {
    stepOf: "الخطوة {step} من {total}",
    title: "ارفعي صورتك",
    submit: "حللي الصورة",
    submitDisabled: "ارفعي صورة للبدء",
    tipLabel: "نصيحة:",
    upload: {
      heading: "ارفعي صورة وجهك",
      hint: "ضوء نهار طبيعي — دون مكياج أو فلاتر",
      action: "اسحبي الصورة أو انقري للرفع",
      remove: "إزالة الصورة",
    },
    samples: {
      heading: "أو جرّبي وجهًا تجريبيًا",
      note: "مُولَّد بالذكاء الاصطناعي — استكشفي دون مشاركة صورتك",
    },
    hair: {
      legend: "هل شعرك بلونه الطبيعي؟",
      groupLabel: "حالة لون الشعر",
      naturalLabel: "طبيعي",
      naturalHint: "لم يُصبغ، أو نما من جديد",
      dyedLabel: "مصبوغ",
      dyedHint: "مصبوغ أو مُفتَّح أو مُلوَّن",
      coveredLabel: "غير ظاهر",
      coveredHint: "مُغطّى أو خارج الإطار",
    },
  },

  loading: {
    done: "تم",
    didYouKnow: "هل تعلمين؟",
    stage: {
      faceModelTitle: "جارٍ التحضير",
      checkingTitle: "جارٍ فحص صورتك",
      detailModelTitle: "جارٍ تحميل نموذج التفاصيل",
      measuringTitle: "جارٍ قياس ألوانك",
      analysingTitle: "جارٍ تحديد فصلك",
      buildingTitle: "جارٍ بناء ملفك",
    },
  },

  errors: {
    qualityFatalTitle: "تعذّرت قراءة هذه الصورة",
    qualitySoftTitle: "هذه الصورة ستعطي نتيجة تقريبية",
    qualityPrivacy: "بقيت صورتك على جهازك — فحصناها هنا، ولم يُرفع شيء.",
    qualityRetake: "جرّبي صورة أخرى",
    systemTitle: "حدث خطأ من جانبنا",
    tipsHeading: "نصائح لصور أفضل:",
  },

  results: {
    navHome: "الرئيسية",
    sectionsLabel: "أقسام النتيجة",
    tabOverview: "نظرة عامة",
    tabBeauty: "الجمال",
    tabStyle: "الأسلوب",
    tabShop: "التسوّق",
    showingFor: "النتائج لفصل {season}",
    notFound: "لم يُعثر على النتائج.",
    startOver: "ابدئي تحليلًا جديدًا",
    continueToBeauty: "تابعي إلى دليل الجمال",

    fan: { copied: "تم النسخ ✓" },

    avoid: {
      titleLead: "يُفضَّل",
      titleAccent: "تجنّبها",
      kicker: "هذه تتعارض مع ألوانك",
    },

    dna: {
      title: "تحليل ألوانك",
      warmth: "الدفء",
      depthAxis: "العمق",
      clarity: "الصفاء",
      contrastAxis: "التباين",
      measured: "المقاس",
      skin: "البشرة",
      hair: "الشعر",
      eyes: "العينان",
      notMeasured: "غير مقاس",
    },

    story: { title: "قصة فصلك" },
    wear: { title: "كيف ترتدين لوحة ألوانك" },

    beauty: {
      title: "دليل جمالك",
      foundationTitle: "كريم الأساس",
      blushTitle: "أحمر الخدود",
      bronzerTitle: "البرونزر",
      lipsTitle: "الشفاه",
      eyesTitle: "العينان",
      nailsTitle: "الأظافر",
      fair: "فاتح",
      deep: "غامق",
      everyday: "يومي",
      bold: "جريء",
      yourShades: "درجاتك",
      skipThese: "تجنّبي هذه",
      copied: "تم النسخ",
    },

    style: {
      title: "دليل أسلوبك",
      metalsTitle: "المعادن",
      yourMetals: "معادنك",
      notYours: "ليست لك",
      notIdeal: "غير مثالي",
      gemsTitle: "الأحجار الكريمة",
      tipsTitle: "نصائح الأسلوب",
      hairTitle: "الشعر",
      hairRecommended: "موصى به",
      hairAvoid: "ألوان يُفضَّل تجنّبها",
    },

    shop: {
      title: "قبل الشراء",
      yourPalette: "لوحة ألوانك",
      dropHeading: "ارفعي صورة للقطعة",
      checking: "جارٍ تحليل الألوان...",
      checkAnother: "افحصي قطعة أخرى",
      closestTones: "أقرب الدرجات من لوحتك",
    },

    chat: {
      openLabel: "اسألي مستشارة الألوان",
      panelLabel: "محادثة مستشارة الألوان",
      closeLabel: "إغلاق المحادثة",
      subtitle: "اسألي عن أي تفصيل",
      clear: "مسح",
      placeholder: "اسألي عن منتج أو درجة لون...",
      inputLabel: "راسلي مستشارة الألوان",
      sendLabel: "إرسال",
      thinking: "جارٍ التفكير",
    },
  },
};
