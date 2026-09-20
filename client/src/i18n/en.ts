/**
 * The English catalogue — every user-facing string in the app.
 *
 * Organised by screen, because that is how strings are found and reviewed: a
 * translator working on Results should not have to guess which of forty
 * components a key belongs to. Shared chrome lives under `common`.
 *
 * Spelling is British throughout ("colour", "analyse", "jewellery"), matching
 * the design copy. The one exception is where a word is part of a proper name
 * or a data value rather than prose.
 *
 * What is deliberately NOT here: season names, palette colour names, shade
 * names and their descriptions. Those are content, not interface — they arrive
 * from the API or from the data modules beside seasonPalettes, and localising
 * them is a separate job with a different source of truth. See i18n/README.md.
 */

export const en = {
  common: {
    brandPrefix: "your",
    brandName: "Aura",
    brandFull: "Your Aura",
    tagline: "AI Colour Analysis",
    seasonSystem: "12 Season System",
    createdBy: "Created by Haneen",
    getStarted: "Get Started",
    back: "Back",
    close: "Close",
    retry: "Try again",
    loading: "Loading",
    languageName: "English",
    switchToArabic: "العربية",
    switchToEnglish: "English",
  },

  results: {
    navHome: "Home",
    sectionsLabel: "Result sections",
    tabOverview: "Overview",
    tabBeauty: "Beauty",
    tabStyle: "Style",
    tabShop: "Shop",
    showingFor: "Showing results for {season}",
    notFound: "Results not found.",
    startOver: "Start a new analysis",
    continueToBeauty: "Continue to Beauty Guide",
    shareWhatsApp: "Share on WhatsApp",
    shareText: "I'm a {season}! Discover your colour season on Your Aura: {url}",

    hero: {
      eyebrow: "Your revelation is complete.",
      paletteCaption: "Your 12 signature tones",
      contrastSuffix: "{level} contrast",
    },

    fan: {
      deckLabel: "Palette colours — arrow keys to browse, Enter to copy",
      cardLabel: "{name} {hex} — press Enter to copy",
      copied: "Copied ✓",
      hint: "Hover a card · click to copy",
    },

    avoid: {
      titleLead: "Worth",
      titleAccent: "avoiding",
      kicker: "These fight your colouring",
      body:
        "Near your face they dull your skin and steal your light — keep them " +
        "below the waist, in accessories, or off the rack entirely.",
      swatchLabel: "{name} — {reason}",
      defaultReason: "clashes with your season",
      hint: "Hover a shade to see why it works against you",
    },

    dna: {
      title: "Your Colour Analysis",
      intro:
        "Our AI analysis has mapped your physical traits to the frequency of {season}. " +
        "Your features possess a {quality}.",
      qualityDeep: "grounded, majestic depth",
      qualityLight: "soft, luminous quality",
      axesTitle: "Colour DNA Analysis",
      axisRangeLabel: "{low} to {high}",
      rowUndertone: "Skin Undertone",
      rowHair: "Hair",
      rowEyes: "Eyes",
      rowContrast: "Contrast",
      cool: "Cool",
      warm: "Warm",
      light: "Light",
      deep: "Deep",
      muted: "Muted",
      clear: "Clear",
      blends: "Blends",
      contrasts: "Contrasts",
    },

    story: {
      title: "Your Season Story",
      /* The fallback when the model returns no seasonStory. Assembled from the
         measured axes, so the adjectives are slots rather than prose. */
      fallback:
        "As a {season}, your colouring reflects {temperature}. Your features carry " +
        "a {contrast} quality with {depth}, {clarity} tones that define your unique " +
        "palette. The colours chosen for you enhance your natural harmony and bring " +
        "out your best features.",
      temperatureWarm: "warmth and richness",
      temperatureCool: "coolness and clarity",
      contrastHigh: "high-contrast",
      contrastSoft: "soft",
      depthDeep: "deep",
      depthLight: "light",
      clarityClear: "clear",
      clarityMuted: "muted",
    },

    wear: {
      title: "How to Wear Your Palette",
      wardrobeTitle: "In Your Wardrobe",
      wardrobeBody:
        "Build your outfits around these grounding neutrals — they form the base " +
        "of everything you wear.",
      makeupTitle: "In Your Makeup",
      makeupBody:
        "These shades harmonise with your undertone for foundation, blush, bronzer, and lips.",
      accentsTitle: "As Your Accents",
      accentsBody:
        "Reach for these when you want to make a statement — in a bag, a lip colour, " +
        "or a bold top.",
    },

    beauty: {
      title: "Your Beauty Guide",
      foundationTitle: "Foundation",
      foundationBody: "Your undertone, met at its true depth.",
      foundationMeter:
        "Your undertone family from fair to deep, with your depth marked at {depth} of 100",
      fair: "Fair",
      deep: "Deep",
      blushTitle: "Blush",
      blushBody: "Where the colour meets your cheekbone.",
      bronzerTitle: "Bronzer",
      bronzerBody: "Warmth placed where the sun would find you.",
      lipsTitle: "Lips",
      lipsBody: "From barely-there to unmistakable.",
      everyday: "Everyday",
      bold: "Bold",
      eyesTitle: "Eyes",
      eyesBody: "Worn soft, the way a palette actually gets used.",
      nailsTitle: "Nails",
      nailsBody: "Ten small canvases, tuned to your season.",
      yourShades: "Your shades",
      skipThese: "Skip these",
      shadeLabel: "{name}{finish} — copy hex {hex}",
      copyHex: "Copy {hex}",
      copied: "Copied",
      notRecommended: ", not recommended",
      shadeMissing: "shade not in library",
    },

    style: {
      title: "Your Style Guide",
      metalsTitle: "Metals",
      metalsBody: "The hardware that agrees with your skin.",
      yourMetals: "Your metals",
      notYours: "Not yours",
      notIdeal: "not ideal",
      gemsTitle: "Gemstones",
      gemsBody: "Stones that return your light.",
      tipsTitle: "Style Tips",
      hairTitle: "Hair",
      hairRecommended: "Recommended",
      hairAvoid: "Colours to avoid",
      hairBestHighlights: "Best Highlights",
      hairOverall: "Overall Direction",
      hairNoteUnavailable:
        "We couldn't read your hair, so this uses your skin and eyes only.",
      hairNoteNatural:
        "You told us your hair is its natural colour, so we included it.",
      hairNoteExcluded:
        "You told us your hair is {status}, so we left it out and used your skin and eyes.",
      hairStatusDyed: "coloured",
      hairStatusCovered: "not visible",
    },

    shop: {
      title: "Before You Buy",
      lede: "Upload a photo of any item — we'll tell you if it matches your {season} palette.",
      yourPalette: "Your palette",
      dropzoneLabel: "Upload a product photo to check against your palette",
      dropHeading: "Upload a photo of the item",
      dropHint: "Tap to browse or drag & drop — JPG, PNG, or WebP",
      uploadedAlt: "Uploaded item",
      checking: "Analysing colours...",
      checkAnother: "Check Another Item",
      closestTones: "Closest tones from your palette",
      scoreLabel: "Match score {score} out of 100 — {verdict}",
      verdictGreat: "Perfect match",
      verdictGood: "Good match",
      verdictMaybe: "Might work",
      verdictAvoid: "Not your colour",
      noAnalysis: "No analysis loaded",
      checkFailed: "Image check failed",
    },

    chat: {
      openLabel: "Ask the colour advisor",
      panelLabel: "Colour advisor chat",
      closeLabel: "Close chat",
      titleWithSeason: "Colour Advisor • {season}",
      subtitle: "Ask anything specific",
      clear: "Clear",
      greeting:
        "Hi! I know your {season} profile. Ask me about any specific product, shade, " +
        "brand, or outfit — I'll give you a direct, personalised answer!",
      placeholder: "Ask about a product or shade...",
      inputLabel: "Message the colour advisor",
      sendLabel: "Send message",
      searching: "Looking up product details",
      thinking: "Thinking",
      failed: "Sorry, I had trouble responding. Please try again.",
      /* Starter prompts. Brand names are proper nouns and stay as written in
         every locale; only the question around them translates. */
      suggestion1: "What Moonglaze blush suits me?",
      suggestion2: "Does Charlotte Tilbury Pillow Talk work on me?",
      suggestion3: "Best OPI nail polish for me?",
      suggestion4: "Is MAC Ruby Woo good for me?",
      suggestion5: "Gold or silver jewellery for me?",
    },
  },

  analysis: {
    stepOf: "Step {step} of {total}",
    title: "Upload Your Photo",
    lede: "Upload a clear photo of your face — natural lighting, no filters, hair visible",
    tipLabel: "Tip:",
    tipBody:
      "Remove makeup if possible for the most accurate results. Avoid filters, " +
      "ring lights, and artificial lighting.",
    submit: "Analyse Photo",
    submitDisabled: "Upload a photo to begin",

    upload: {
      dropzoneLabel: "Upload a photo of your face",
      heading: "Upload Your Face",
      hint: "Natural daylight — no makeup, no filters",
      action: "Drop or tap to upload",
      previewAlt: "Face Photo",
      previewCaption: "Face Photo",
      remove: "Remove photo",
    },

    samples: {
      heading: "Or try a sample face",
      note: "AI-generated — explore without sharing your photo",
      itemLabel: "Analyse sample face {n}",
    },

    hair: {
      legend: "Is your hair its natural colour?",
      note:
        "Coloured hair tells us nothing about your natural colouring, so we leave it out.",
      groupLabel: "Hair colour status",
      naturalLabel: "Natural",
      naturalHint: "Never coloured, or grown out",
      dyedLabel: "Coloured",
      dyedHint: "Dyed, highlighted or toned",
      coveredLabel: "Not visible",
      coveredHint: "Covered, or out of frame",
    },
  },

  loading: {
    percent: "{percent}%",
    done: "Done",
    reassurance: "This usually takes 20-30 seconds — hang tight!",
    didYouKnow: "Did you know?",

    stage: {
      faceModelTitle: "Getting ready",
      faceModelBody: "Downloading the face model — this happens once.",
      checkingTitle: "Checking your photo",
      checkingBody: "Focus, lighting and framing, right here on your device...",
      detailModelTitle: "Loading detail model",
      detailModelBody: "One more download so we can read your hair...",
      measuringTitle: "Measuring your colouring",
      measuringBody: "Reading skin, hair and eye colour in CIE Lab...",
      analysingTitle: "Determining your season",
      analysingBody: "Matching your measurements against the 12 seasons...",
      buildingTitle: "Building your profile",
      buildingBody: "Generating your palette, makeup guide, and recommendations...",
    },

    /* Trivia shown while the pipeline runs. Named rather than indexed so a
       translator can see what each one is, and so reordering them is safe. */
    fact: {
      caygill:
        "Colour analysis originated in the 1940s when artist Suzanne Caygill noticed " +
        "people look better in certain colour families.",
      jackson:
        "The 4-season system was popularised by Carole Jackson's 1980 book " +
        "'Color Me Beautiful'.",
      korea:
        "Korean personal colour analysis (퍼스널컬러) became a massive beauty trend " +
        "in the 2010s.",
      undertone:
        "Your undertone never changes — it's determined by your melanin, haemoglobin, " +
        "and carotenoid levels.",
      hair:
        "Your natural hair colour provides strong clues about whether you're warm " +
        "or cool-toned.",
      precision:
        "The 12-season system provides 3x more precision than the basic 4-season model.",
      skin:
        "Wearing your right colours can make your skin look clearer and more even " +
        "without any makeup.",
    },
  },

  errors: {
    qualityFatalTitle: "We can't read that photo",
    qualitySoftTitle: "This photo will give a rough result",
    qualityPrivacy:
      "Your photo stayed on your device — we checked it here, and nothing was uploaded.",
    qualityRetake: "Try another photo",

    systemTitle: "Something went wrong on our side",
    systemReassurance: "Your photo is fine — there's nothing you need to change about it.",

    sampleTitle: "Couldn't Load Sample",
    photoTitle: "Better Photos Needed",
    tipsHeading: "Tips for better photos:",

    sampleLoad: "Failed to load sample.",
    lowConfidence: "The AI needs better photos for an accurate analysis.",
    offline: "We couldn't reach the server. Check your connection and try again.",
    server:
      "Something went wrong on our side — this isn't a problem with your photo. " +
      "Please try again.",
  },

  home: {
    eyebrow: "AI-Powered Colour Analysis",
    titleLine1: "Discover the Colours",
    titleLine2Lead: "That Were",
    titleLine2Accent: "Made for You",
    lede:
      "Upload one photo. Your Aura reads your undertone, depth, and contrast " +
      "to reveal your seasonal colour palette — your colours, your rules.",
    ctaPrimary: "Discover Your Palette",
    ctaSecondary: "How It Works",

    drape: {
      prompt: "Which one wakes up your face?",
      spring: "Spring freshens you.",
      summer: "Summer softens you.",
      autumn: "Autumn warms you.",
      winter: "Winter sharpens you.",
    },

    poetry: {
      title: "Precision Meets Poetry",
      body:
        "We combine advanced AI colour science with an artistic eye to decode " +
        "the hues that make you radiant.",
      closing: "From a single portrait to your complete colour world.",
    },

    journey: {
      eyebrow: "How It Works",
      title: "Path to Discovery",
      step1Title: "Upload",
      step1Body:
        "A clear photo of your face in natural light — that's all we need to begin.",
      step2Title: "Analyse",
      step2Body:
        "AI reads your skin undertone, eye colour, and natural contrast level in seconds.",
      step3Title: "Discover",
      step3Body:
        "Your complete colour season, palette, and personalised beauty guide — revealed.",
    },

    whatYouGet: {
      title: "What You Get",
      seasonTitle: "Your Season",
      seasonBody:
        "Your personal season from the 12-season system with complete colour analysis",
      paletteTitle: "Colour Palette",
      paletteBody: "12 curated shades in your exact seasonal colours",
      beautyTitle: "Beauty Guide",
      beautyBody:
        "Foundation, blush, bronzer, lips, and eyeshadow matched to your undertone",
      nailsTitle: "Nail Guide",
      nailsBody: "3 nail swatches perfectly matched to your palette",
      metalsTitle: "Metals & Gemstones",
      metalsBody: "Your ideal jewellery metals and gemstone recommendations",
      checkTitle: "Before You Buy",
      checkBody: "Upload any product photo to check if it matches your palette",
    },

    /* Labels on the Home feature preview. The preview's *content* — the season,
       the shade names, the sample verdict — is still mock data and is not here:
       sprint rule 10 replaces it with real demo-face analyses, and translating
       placeholder product names first would be work thrown away. */
    mockup: {
      seasonResult: "Season Result",
      undertone: "Undertone",
      yourPalette: "Your Palette",
      bestColours: "Best Colours",
      coloursToAvoid: "Colours to Avoid",
      beautyMatch: "Beauty Match",
      lipsAndCheeks: "Lips & Cheeks",
      nailShades: "Nail Shades",
      topPicks: "Top Picks",
      metalMatch: "Metal Match",
      yourMetals: "Your Metals",
      colourCheck: "Colour Check",
      beforeYouBuy: "Before You Buy",
      match: "Match",
      ideal: "Ideal",
      notIdeal: "Not Ideal",
    },

    carousel: {
      title: "Which Season Are You?",
    },

    cta: {
      title: "Ready to Meet Your Colours?",
      body: "Upload one photo and discover the palette that was always meant for you.",
      button: "Discover Your Palette",
    },
  },
};
