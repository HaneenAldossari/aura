export interface Blindspot {
  color: string;
  hex: string;
  whyAvoided: string;
  whyItWorks: string;
  celebrity: string;
  challengeText: string;
  rating: string;
}

export const SEASON_BLINDSPOTS: Record<string, Blindspot[]> = {
  'Deep Autumn': [
    {
      color: 'Forest Green',
      hex: '#355E3B',
      whyAvoided: 'Most people think green is risky or only for certain skin tones.',
      whyItWorks: 'Forest green has warm, earthy undertones that mirror your olive skin perfectly. It makes your brown eyes appear deeper and your skin glow with warmth.',
      celebrity: 'Salma Hayek',
      challengeText: 'Try it as a blazer or scarf first — you\'ll be surprised.',
      rating: 'Your secret weapon color'
    },
    {
      color: 'Warm Plum',
      hex: '#4A2040',
      whyAvoided: 'People assume purple is always cool-toned and therefore wrong for warm seasons.',
      whyItWorks: 'Warm plum has enough red and brown in it to stay in the warm family. It creates stunning contrast with deep olive skin and looks incredibly rich.',
      celebrity: 'Penélope Cruz',
      challengeText: 'Wear it as a lip color first — low commitment, high impact.',
      rating: 'Your most underrated evening color'
    },
    {
      color: 'Dark Mustard',
      hex: '#967117',
      whyAvoided: 'Yellow family colors feel risky — people worry they\'ll look washed out.',
      whyItWorks: 'Mustard is essentially liquid gold for Deep Autumns. The deep, muted yellow perfectly echoes the golden undertones in your skin and makes you look luminous.',
      celebrity: 'Priyanka Chopra',
      challengeText: 'Try a mustard knit or bag — easiest entry point.',
      rating: 'Your most luminous color'
    }
  ],
  'True Autumn': [
    {
      color: 'Teal',
      hex: '#2E8B8B',
      whyAvoided: 'Blue-family colors seem off-limits for warm seasons.',
      whyItWorks: 'Teal has enough warm green in it to work beautifully on True Autumns. It adds richness without fighting your warmth.',
      celebrity: 'Julia Roberts',
      challengeText: 'Try a teal scarf or jewelry accent first.',
      rating: 'Your unexpected power color'
    },
    {
      color: 'Burnt Orange',
      hex: '#CC5500',
      whyAvoided: 'People think it\'s "too loud" or "too orange" for everyday.',
      whyItWorks: 'Burnt orange is literally your season\'s signature — it makes golden-warm skin radiate from within. It\'s as natural on you as denim on everyone else.',
      celebrity: 'Amy Adams',
      challengeText: 'Swap your beige neutral bag for a burnt orange one.',
      rating: 'Your signature statement color'
    },
    {
      color: 'Moss Green',
      hex: '#8A9A5B',
      whyAvoided: 'Green feels unconventional for professional or everyday looks.',
      whyItWorks: 'Moss green is the most natural color in the Autumn palette — it mirrors nature itself. On your warm skin, it creates effortless sophistication.',
      celebrity: 'Julianne Moore',
      challengeText: 'Try a moss green shirt under a brown jacket.',
      rating: 'Your most natural everyday color'
    }
  ],
  'Soft Autumn': [
    {
      color: 'Sage Green',
      hex: '#B2AC88',
      whyAvoided: 'People think it\'s too muted or "boring" to make an impact.',
      whyItWorks: 'Sage is YOUR neutral — it\'s the equivalent of what black is for Winters. On Soft Autumn skin, it creates a serene, glowing harmony.',
      celebrity: 'Drew Barrymore',
      challengeText: 'Replace one black basics piece with sage.',
      rating: 'Your version of black'
    },
    {
      color: 'Warm Rose',
      hex: '#C08081',
      whyAvoided: 'Pink feels too feminine or too cool-toned for most warm seasons.',
      whyItWorks: 'Warm rose sits perfectly between warm and soft — the muted quality matches your low-contrast coloring while the warmth keeps it harmonious.',
      celebrity: 'Jennifer Aniston',
      challengeText: 'Start with warm rose blush or lipstick.',
      rating: 'Your most flattering pink'
    },
    {
      color: 'Coffee',
      hex: '#6F4E37',
      whyAvoided: 'Brown feels "plain" — people reach for black instead.',
      whyItWorks: 'Rich coffee brown is your best dark neutral. While black creates too much contrast for Soft Autumns, coffee harmonizes perfectly with your muted warmth.',
      celebrity: 'Jessica Alba',
      challengeText: 'Swap black pants for coffee brown trousers.',
      rating: 'Your most sophisticated neutral'
    }
  ],
  'Deep Winter': [
    {
      color: 'True Red',
      hex: '#C8102E',
      whyAvoided: 'People feel red is "too bold" or attention-seeking for daily wear.',
      whyItWorks: 'As a Deep Winter, your high-contrast coloring NEEDS bold colors to match your intensity. True red is your ultimate power color.',
      celebrity: 'Lupita Nyong\'o',
      challengeText: 'Try a red lip on a regular day — not just events.',
      rating: 'Your ultimate power color'
    },
    {
      color: 'Emerald',
      hex: '#046307',
      whyAvoided: 'Green feels risky and people default to "safe" black or navy.',
      whyItWorks: 'Emerald has cool blue undertones that resonate with your winter palette. The deep richness matches your depth perfectly.',
      celebrity: 'Sandra Oh',
      challengeText: 'Try an emerald dress or blazer for your next event.',
      rating: 'Your most regal color'
    },
    {
      color: 'Icy Pink',
      hex: '#FFD1DC',
      whyAvoided: 'Light pink seems too delicate for deep, dramatic coloring.',
      whyItWorks: 'Icy pink works as a surprising contrast piece — the cool undertone matches your palette while the lightness creates dramatic contrast with your dark features.',
      celebrity: 'Kerry Washington',
      challengeText: 'Try an icy pink shirt under a dark blazer.',
      rating: 'Your most unexpected contrast color'
    }
  ],
  'True Winter': [
    {
      color: 'Fuchsia',
      hex: '#C8007A',
      whyAvoided: 'Feels too loud and attention-grabbing for most people.',
      whyItWorks: 'True Winter is the boldest palette — fuchsia\'s cool, vivid nature is perfectly calibrated for your high-clarity coloring.',
      celebrity: 'Anne Hathaway',
      challengeText: 'Try a fuchsia accessory — bag, scarf, or shoes.',
      rating: 'Your most vibrant color'
    },
    {
      color: 'Electric Blue',
      hex: '#0047AB',
      whyAvoided: 'Blue feels like "everyone\'s color" so people don\'t prioritize it.',
      whyItWorks: 'Electric blue is anything but generic on you — the cool clarity makes your features pop with incredible sharpness.',
      celebrity: 'Cate Blanchett',
      challengeText: 'Try a cobalt blue top instead of navy.',
      rating: 'Your color upgrade from navy'
    },
    {
      color: 'Stark White',
      hex: '#FFFFFF',
      whyAvoided: 'White feels "basic" and people worry about it washing them out.',
      whyItWorks: 'While warm seasons get washed out by white, True Winter THRIVES in it. Stark white creates the dramatic frame your coloring craves.',
      celebrity: 'Olivia Munn',
      challengeText: 'Wear a pure white shirt with dark jeans — notice the glow.',
      rating: 'Your cleanest power move'
    }
  ],
  'Bright Winter': [
    {
      color: 'Hot Pink',
      hex: '#FF69B4',
      whyAvoided: 'Feels juvenile or too bold for professional settings.',
      whyItWorks: 'Your clear, bright coloring is literally designed for this — hot pink makes Bright Winters look electric and alive.',
      celebrity: 'Megan Fox',
      challengeText: 'Try hot pink nails or a bold lip.',
      rating: 'Your most alive color'
    },
    {
      color: 'Lemon Yellow',
      hex: '#FFF44F',
      whyAvoided: 'Yellow is the most feared color in fashion — most people avoid it entirely.',
      whyItWorks: 'Bright, clear yellow matches your high-clarity palette. Unlike warm mustard, lemon yellow has the cool brightness that makes Bright Winters glow.',
      celebrity: 'Lucy Liu',
      challengeText: 'Try a yellow accessory — earrings or a bag.',
      rating: 'Your boldest surprise color'
    },
    {
      color: 'Royal Purple',
      hex: '#7851A9',
      whyAvoided: 'Purple feels theatrical or hard to style in everyday outfits.',
      whyItWorks: 'Royal purple has the clarity and depth that mirrors your coloring perfectly. It\'s actually as easy to wear as blue.',
      celebrity: 'Zendaya',
      challengeText: 'Try a purple knit or blazer — treat it like navy.',
      rating: 'Your new navy alternative'
    }
  ],
  'Light Spring': [
    {
      color: 'Peach',
      hex: '#FFDAB9',
      whyAvoided: 'Peach feels too "safe" or boring compared to bolder choices.',
      whyItWorks: 'Peach is your equivalent of a nude lip — it\'s not boring, it\'s effortlessly perfect. It makes Light Spring skin look fresh and luminous.',
      celebrity: 'Taylor Swift',
      challengeText: 'Try a peach blouse instead of white.',
      rating: 'Your effortless glow color'
    },
    {
      color: 'Warm Turquoise',
      hex: '#48D1CC',
      whyAvoided: 'People think turquoise is too vacation-y for regular wear.',
      whyItWorks: 'The warm green-blue of turquoise is magic on Light Springs — it makes your eyes sparkle and your skin look warm and clear.',
      celebrity: 'Reese Witherspoon',
      challengeText: 'Try turquoise jewelry — it\'s the easiest entry.',
      rating: 'Your most eye-catching color'
    },
    {
      color: 'Light Coral',
      hex: '#F08080',
      whyAvoided: 'Coral feels like a summer trend, not a year-round color.',
      whyItWorks: 'Light coral mimics the natural flush in Spring skin — it looks like health itself on you. Year-round, not seasonal.',
      celebrity: 'Amanda Seyfried',
      challengeText: 'Make coral your go-to lip color.',
      rating: 'Your natural flush color'
    }
  ],
  'True Spring': [
    {
      color: 'Warm Coral',
      hex: '#FF6B47',
      whyAvoided: 'Feels too bold or orange for everyday wear.',
      whyItWorks: 'Coral is Spring\'s version of a neutral — it mimics the natural flush in Spring skin and makes everything look effortless.',
      celebrity: 'Blake Lively',
      challengeText: 'Start with a coral lip — it looks like your natural lip but better.',
      rating: 'Your most effortless color'
    },
    {
      color: 'Grass Green',
      hex: '#7CFC00',
      whyAvoided: 'Bright green feels bold and hard to style.',
      whyItWorks: 'True Spring is the warmest, brightest palette — vivid green makes you look fresh and energetic in a way no other season can pull off.',
      celebrity: 'Cameron Diaz',
      challengeText: 'Try a green dress or top — go bold.',
      rating: 'Your freshest color'
    },
    {
      color: 'Warm Tangerine',
      hex: '#FF9966',
      whyAvoided: 'Orange family colors scare people who aren\'t used to warm dressing.',
      whyItWorks: 'Tangerine is YOUR nude — the warm golden orange makes Spring skin absolutely glow with warmth and vitality.',
      celebrity: 'Isla Fisher',
      challengeText: 'Try a tangerine scarf or bag as a starting point.',
      rating: 'Your glow-activator color'
    }
  ],
  'Bright Spring': [
    {
      color: 'Aqua',
      hex: '#00CED1',
      whyAvoided: 'Aqua feels too "fun" for serious or professional settings.',
      whyItWorks: 'Your clear, bright coloring demands clear, bright colors — aqua makes Bright Springs look sharp and alive.',
      celebrity: 'Jennifer Lawrence',
      challengeText: 'Try an aqua top for your next meeting — it reads as professional brightness.',
      rating: 'Your professional pop color'
    },
    {
      color: 'Bright Coral',
      hex: '#FF4040',
      whyAvoided: 'Feels too close to red and too attention-grabbing.',
      whyItWorks: 'Bright Spring handles attention — your coloring is DESIGNED for vivid warmth. Bright coral makes you look magnetic.',
      celebrity: 'Margot Robbie',
      challengeText: 'Wear bright coral as your statement lip color.',
      rating: 'Your magnetic color'
    },
    {
      color: 'Kelly Green',
      hex: '#4CBB17',
      whyAvoided: 'Bright green feels "too much" for most wardrobes.',
      whyItWorks: 'Kelly green has the clarity and warmth that perfectly matches your Bright Spring energy. It\'s your secret to standing out effortlessly.',
      celebrity: 'Scarlett Johansson',
      challengeText: 'Try a kelly green shirt or dress.',
      rating: 'Your standout color'
    }
  ],
  'Light Summer': [
    {
      color: 'Soft Lavender',
      hex: '#C4B7D5',
      whyAvoided: 'Lavender feels too delicate or "old-fashioned."',
      whyItWorks: 'Lavender is your superpower — the cool, soft hue perfectly mirrors your low-contrast coloring and makes your skin look porcelain-smooth.',
      celebrity: 'Naomi Watts',
      challengeText: 'Try a lavender blouse instead of white or gray.',
      rating: 'Your ethereal signature color'
    },
    {
      color: 'Powder Blue',
      hex: '#B0C4DE',
      whyAvoided: 'Light blue seems too common and unremarkable.',
      whyItWorks: 'Powder blue makes Light Summer coloring look angelic — the soft cool tone creates gentle harmony that enhances rather than competes with you.',
      celebrity: 'Nicole Kidman',
      challengeText: 'Try powder blue as your new neutral base.',
      rating: 'Your most harmonious neutral'
    },
    {
      color: 'Soft Rose',
      hex: '#D4A0A0',
      whyAvoided: 'Pink seems too "girly" for some and too safe for others.',
      whyItWorks: 'Soft rose is your version of a nude — it enhances your natural cool pink flush and creates an effortless, healthy glow.',
      celebrity: 'Gwyneth Paltrow',
      challengeText: 'Make soft rose your everyday lip and blush shade.',
      rating: 'Your natural enhancement color'
    }
  ],
  'True Summer': [
    {
      color: 'Slate Blue',
      hex: '#6A7B99',
      whyAvoided: 'Blue-gray seems boring or too corporate.',
      whyItWorks: 'Slate blue is the most sophisticated neutral in your palette — cooler than navy, more interesting than gray, and perfectly matched to your muted coolness.',
      celebrity: 'Emily Blunt',
      challengeText: 'Replace your black blazer with slate blue.',
      rating: 'Your most sophisticated neutral'
    },
    {
      color: 'Raspberry',
      hex: '#A8385D',
      whyAvoided: 'Bold pinks feel too bright for people used to muted palettes.',
      whyItWorks: 'Raspberry is the boldest color True Summer can wear — the cool berry undertone keeps it in harmony while adding drama.',
      celebrity: 'Keira Knightley',
      challengeText: 'Try a raspberry lip for evening looks.',
      rating: 'Your boldest safe color'
    },
    {
      color: 'Cocoa',
      hex: '#7B6B5D',
      whyAvoided: 'Brown seems like an "autumn" color that cool seasons should avoid.',
      whyItWorks: 'Cocoa has cool gray undertones that make it a True Summer neutral. It\'s warmer than black but still cool enough for your palette.',
      celebrity: 'Kate Middleton',
      challengeText: 'Try cocoa brown accessories instead of black.',
      rating: 'Your warm neutral exception'
    }
  ],
  'Soft Summer': [
    {
      color: 'Dusty Teal',
      hex: '#5F9EA0',
      whyAvoided: 'Teal feels too bold for the gentle Soft Summer palette.',
      whyItWorks: 'Dusty teal is teal with the volume turned down — the muted quality matches your softness while the cool tone keeps it harmonious.',
      celebrity: 'Sarah Jessica Parker',
      challengeText: 'Try a dusty teal scarf or top layer.',
      rating: 'Your sophisticated surprise color'
    },
    {
      color: 'Mauve',
      hex: '#9C6B8B',
      whyAvoided: 'Mauve seems too purple or too specific to style easily.',
      whyItWorks: 'Mauve is YOUR power color — the muted purple-pink is calibrated perfectly for your low-contrast, cool-neutral coloring.',
      celebrity: 'Adele',
      challengeText: 'Try a mauve dress or coat — it becomes an instant compliment magnet.',
      rating: 'Your compliment-magnet color'
    },
    {
      color: 'Soft Sage',
      hex: '#9CAF88',
      whyAvoided: 'Green feels like it belongs to warm palettes only.',
      whyItWorks: 'Soft sage has cool, muted undertones that sit perfectly in the Soft Summer palette. It\'s restful and sophisticated on you.',
      celebrity: 'Ashley Olsen',
      challengeText: 'Try sage as a neutral — shirt, pants, or accessories.',
      rating: 'Your coolest green ally'
    }
  ],
};

export function getBlindspots(season: string): Blindspot[] {
  // Try to match season name
  const key = Object.keys(SEASON_BLINDSPOTS).find(
    k => season.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(season.toLowerCase())
  );
  return SEASON_BLINDSPOTS[key || 'Deep Autumn'] || SEASON_BLINDSPOTS['Deep Autumn'];
}
