/** First-step selection: lens type category. Filters all options and recommendation. */
export type LensTypeCategory = 'single_vision' | 'bifocal_progressive' | 'zero_power' | 'frame_only';

export interface LensOption {
  id: string;
  name: string;
  shortDesc: string;
  description: string;
  whoIsItFor: string;
  price: number;
  /** Which "Select Lens Type" category this belongs to */
  lensTypeCategory: LensTypeCategory;
  useCases: ('reading' | 'computer' | 'driving' | 'all' | 'blue_cut' | 'bifocal')[];
  blueCut?: boolean;
  type: 'single_vision' | 'blue_cut' | 'bifocal' | 'progressive' | 'non_prescription';
  badge?: string;
}

/** For the "Select Lens Type" first screen (like the reference UI). */
export const LENS_TYPE_CATEGORIES: { id: LensTypeCategory; name: string; description: string }[] = [
  { id: 'single_vision', name: 'Single Vision', description: 'For distance or near vision (Thin, anti-glare, blue-cut options)' },
  { id: 'bifocal_progressive', name: 'Bifocal/Progressive', description: 'Bifocal and Progressives (For two powers in same lenses)' },
  { id: 'zero_power', name: 'Zero Power', description: 'Block 98% of harmful rays (Anti-glare and blue-cut options)' },
  { id: 'frame_only', name: 'Frame Only', description: 'Buy Only Frame' },
];

export const LENS_OPTIONS: LensOption[] = [
  {
    id: 'single-vision',
    name: 'Single Vision',
    shortDesc: 'Clear vision at one distance',
    description: 'Standard lenses with one power for either near or distance. One prescription for your main activity.',
    whoIsItFor: 'Best for: First-time glass wearers, anyone with one power for daily use (distance OR near). Ideal if you use the same power for most of the day.',
    price: 999,
    lensTypeCategory: 'single_vision',
    useCases: ['all'],
    type: 'single_vision',
    badge: 'Popular',
  },
  {
    id: 'blue-cut',
    name: 'Blue Cut',
    shortDesc: 'Reduce screen strain & blue light',
    description: 'Special coating that filters harmful blue light from screens. Reduces eye strain, dryness and sleep disruption from devices.',
    whoIsItFor: 'Best for: Office workers, students, WFH professionals, gamers — anyone on laptop/phone/tablet for 4+ hours a day. Also good if you feel tired or dry eyes after screen time.',
    price: 1499,
    lensTypeCategory: 'single_vision',
    useCases: ['computer', 'all'],
    blueCut: true,
    type: 'blue_cut',
    badge: 'Recommended',
  },
  {
    id: 'reading',
    name: 'Reading Lenses',
    shortDesc: 'Comfortable for books & close work',
    description: 'Optimised for near vision: books, mobile, fine print, crafting, and close-up work. Reduces strain when focusing at arm’s length.',
    whoIsItFor: 'Best for: People 40+ who need help with small text (presbyopia), or anyone who reads/crafts a lot and gets headaches or tired eyes. Perfect for desk work and reading.',
    price: 1299,
    lensTypeCategory: 'single_vision',
    useCases: ['reading', 'all'],
    type: 'single_vision',
  },
  {
    id: 'bifocal',
    name: 'Bifocal',
    shortDesc: 'Two powers in one lens',
    description: 'Upper zone for distance (driving, TV), lower zone for near (reading, phone). Clear line between the two; no need to switch glasses.',
    whoIsItFor: 'Best for: People who need both distance and reading power. You look up for far and down for near. Classic option; some prefer the visible line so they know which zone they’re using.',
    price: 2499,
    lensTypeCategory: 'bifocal_progressive',
    useCases: ['reading', 'driving', 'all'],
    type: 'bifocal',
  },
  {
    id: 'progressive',
    name: 'Progressive (No-Line)',
    shortDesc: 'Smooth transition, no visible line',
    description: 'One lens with smooth transition from distance (top) to intermediate (middle) to near (bottom). No bifocal line; looks like a regular lens.',
    whoIsItFor: 'Best for: Anyone who needs distance + reading but doesn’t want the visible line of bifocals. Great for driving, computer and reading without changing glasses. Premium, seamless option.',
    price: 3999,
    lensTypeCategory: 'bifocal_progressive',
    useCases: ['reading', 'driving', 'all'],
    type: 'progressive',
  },
  {
    id: 'non-prescription',
    name: 'Zero Power (Non-prescription)',
    shortDesc: 'Block harmful rays, no power',
    description: 'Zero power lenses with anti-glare and blue-cut options. Block 98% of harmful blue light without vision correction.',
    whoIsItFor: 'Best for: People who don’t need power — fashion use, or blue-cut only for screen protection. Also for spare/backup frames or when your doctor said no correction needed.',
    price: 499,
    lensTypeCategory: 'zero_power',
    useCases: ['all', 'computer'],
    blueCut: true,
    type: 'non_prescription',
  },
  {
    id: 'frame-only',
    name: 'Frame Only',
    shortDesc: 'No lens – frame only',
    description: 'Buy only the frame. No lens included; you can add lenses later or use elsewhere.',
    whoIsItFor: 'Best for: When you only want the frame — to use with your own lenses, or to get lenses fitted elsewhere.',
    price: 0,
    lensTypeCategory: 'frame_only',
    useCases: ['all'],
    type: 'non_prescription',
  },
];

export type QuizAnswerUse = 'reading' | 'computer' | 'driving' | 'all';
export type QuizAnswerScreen = 'yes' | 'no';
export type QuizAnswerPower = 'yes' | 'no';

export interface LensQuizAnswers {
  primaryUse: QuizAnswerUse;
  longScreenTime: QuizAnswerScreen;
  needPower: QuizAnswerPower;
}

/** Get the lens list to use: lensesFromConfig if present and non-empty, else LENS_OPTIONS. */
export function getLensesList(lensesFromConfig: LensOption[] | undefined): LensOption[] {
  return lensesFromConfig != null && lensesFromConfig.length > 0 ? lensesFromConfig : LENS_OPTIONS;
}

/** All lenses in a given lens type category (for filtering after first step). */
export function getLensesByCategory(category: LensTypeCategory, lensList?: LensOption[]): LensOption[] {
  const list = lensList ?? LENS_OPTIONS;
  return list.filter((l) => l.lensTypeCategory === category);
}

/** Recommend one lens from the given category, using quiz answers when category needs it. */
export function getRecommendedLens(answers: LensQuizAnswers, category: LensTypeCategory, lensList?: LensOption[]): LensOption {
  const fullList = lensList ?? LENS_OPTIONS;
  const list = getLensesByCategory(category, fullList);
  if (list.length === 0) return fullList[0];
  if (list.length === 1) return list[0];

  const { primaryUse, longScreenTime } = answers;

  if (category === 'single_vision') {
    if (longScreenTime === 'yes') {
      const blueCut = list.find((l) => l.id === 'blue-cut');
      if (blueCut) return blueCut;
    }
    if (primaryUse === 'reading') {
      const reading = list.find((l) => l.id === 'reading');
      if (reading) return reading;
    }
    const single = list.find((l) => l.id === 'single-vision');
    return single ?? list[0];
  }

  if (category === 'bifocal_progressive') {
    const progressive = list.find((l) => l.id === 'progressive');
    const bifocal = list.find((l) => l.id === 'bifocal');
    return progressive ?? bifocal ?? list[0];
  }

  if (category === 'zero_power') {
    return list.find((l) => l.id === 'non-prescription') ?? list[0];
  }

  if (category === 'frame_only') {
    return list.find((l) => l.id === 'frame-only') ?? list[0];
  }

  return list[0];
}
