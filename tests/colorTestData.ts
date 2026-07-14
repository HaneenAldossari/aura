export interface TestCase {
  name: string;
  expectedSeason: string;
  expectedUndertone: "warm" | "cool" | "neutral";
  wikipediaName: string;
  searchQuery: string;
  notes: string;
}

export const TEST_CASES: TestCase[] = [
  // DEEP AUTUMN
  {
    name: "Salma Hayek",
    expectedSeason: "Deep Autumn",
    expectedUndertone: "warm",
    wikipediaName: "Salma_Hayek",
    searchQuery: "Salma Hayek natural light no makeup",
    notes: "Warm olive skin, near-black hair, dark warm eyes",
  },
  {
    name: "Penelope Cruz",
    expectedSeason: "Deep Autumn",
    expectedUndertone: "warm",
    wikipediaName: "Pen%C3%A9lope_Cruz",
    searchQuery: "Penelope Cruz natural daylight photo",
    notes: "Classic warm deep coloring",
  },
  {
    name: "Priyanka Chopra",
    expectedSeason: "Deep Autumn",
    expectedUndertone: "warm",
    wikipediaName: "Priyanka_Chopra",
    searchQuery: "Priyanka Chopra natural light close up",
    notes: "Warm golden skin, dark features",
  },

  // SOFT SUMMER
  {
    name: "Jennifer Aniston",
    expectedSeason: "Soft Summer",
    expectedUndertone: "neutral",
    wikipediaName: "Jennifer_Aniston",
    searchQuery: "Jennifer Aniston natural light no filter",
    notes: "Classic soft summer - neutral cool undertone, muted coloring",
  },

  // TRUE SUMMER
  {
    name: "Cate Blanchett",
    expectedSeason: "True Summer",
    expectedUndertone: "cool",
    wikipediaName: "Cate_Blanchett",
    searchQuery: "Cate Blanchett natural daylight photo",
    notes: "Cool undertone, medium contrast",
  },

  // BRIGHT WINTER
  {
    name: "Anne Hathaway",
    expectedSeason: "Bright Winter",
    expectedUndertone: "cool",
    wikipediaName: "Anne_Hathaway",
    searchQuery: "Anne Hathaway natural light close up",
    notes: "High contrast, cool, vivid",
  },

  // DARK WINTER
  {
    name: "Megan Fox",
    expectedSeason: "Dark Winter",
    expectedUndertone: "cool",
    wikipediaName: "Megan_Fox",
    searchQuery: "Megan Fox natural light photo",
    notes: "Very dark features, cool undertone",
  },

  // TRUE SPRING
  {
    name: "Taylor Swift",
    expectedSeason: "True Spring",
    expectedUndertone: "warm",
    wikipediaName: "Taylor_Swift",
    searchQuery: "Taylor Swift natural daylight no makeup",
    notes: "Warm, clear, medium-light",
  },

  // LIGHT SPRING
  {
    name: "Blake Lively",
    expectedSeason: "Light Spring",
    expectedUndertone: "warm",
    wikipediaName: "Blake_Lively",
    searchQuery: "Blake Lively natural light close up",
    notes: "Light warm coloring, golden",
  },

  // TRUE AUTUMN
  {
    name: "Jessica Alba",
    expectedSeason: "True Autumn",
    expectedUndertone: "warm",
    wikipediaName: "Jessica_Alba",
    searchQuery: "Jessica Alba natural light photo",
    notes: "Warm medium coloring, earthy",
  },

  // SOFT AUTUMN
  {
    name: "Angelina Jolie",
    expectedSeason: "Soft Autumn",
    expectedUndertone: "neutral",
    wikipediaName: "Angelina_Jolie",
    searchQuery: "Angelina Jolie natural light no makeup",
    notes: "Neutral warm, muted, medium contrast",
  },

  // LIGHT SUMMER
  {
    name: "Gwyneth Paltrow",
    expectedSeason: "Light Summer",
    expectedUndertone: "cool",
    wikipediaName: "Gwyneth_Paltrow",
    searchQuery: "Gwyneth Paltrow natural daylight close up",
    notes: "Very light, cool, low contrast",
  },

  // TRUE WINTER
  {
    name: "Lucy Liu",
    expectedSeason: "True Winter",
    expectedUndertone: "cool",
    wikipediaName: "Lucy_Liu",
    searchQuery: "Lucy Liu natural light photo",
    notes: "Cool, high contrast, clear",
  },
];
