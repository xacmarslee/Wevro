import { type WordCategory } from "./schema";

// Category color definitions for both light and dark modes
// Format: { light: "hsl(...)", dark: "hsl(...)" }
export const categoryColors: Record<WordCategory, { light: string; dark: string; name: string }> = {
  derivatives: {
    light: "hsl(221, 83%, 53%)", // Blue
    dark: "hsl(217, 91%, 60%)",
    name: "blue"
  },
  synonyms: {
    light: "hsl(142, 71%, 45%)", // Green
    dark: "hsl(142, 76%, 36%)",
    name: "green"
  },
  antonyms: {
    light: "hsl(0, 84%, 60%)", // Red
    dark: "hsl(0, 72%, 51%)",
    name: "red"
  },
  collocations: {
    light: "hsl(280, 65%, 60%)", // Purple
    dark: "hsl(280, 61%, 50%)",
    name: "purple"
  },
  idioms: {
    light: "hsl(32, 95%, 44%)", // Orange
    dark: "hsl(25, 95%, 53%)",
    name: "orange"
  },
  root: {
    light: "hsl(340, 75%, 55%)", // Pink
    dark: "hsl(340, 82%, 52%)",
    name: "pink"
  },
  prefix: {
    light: "hsl(173, 80%, 40%)", // Teal
    dark: "hsl(173, 58%, 39%)",
    name: "teal"
  },
  suffix: {
    light: "hsl(48, 89%, 50%)", // Yellow
    dark: "hsl(45, 93%, 47%)",
    name: "yellow"
  },
  "topic-related": {
    light: "hsl(262, 83%, 58%)", // Indigo
    dark: "hsl(263, 70%, 50%)",
    name: "indigo"
  },
};

// Get color for a category based on theme
export function getCategoryColor(category: WordCategory, isDark: boolean): string {
  return isDark ? categoryColors[category].dark : categoryColors[category].light;
}

// Get a lighter background version for buttons
export function getCategoryBgColor(category: WordCategory, isDark: boolean): string {
  const color = categoryColors[category];
  // Return a more muted/lighter version for backgrounds
  if (isDark) {
    // In dark mode, use darker, muted versions
    return color.dark.replace(/(\d+)%\)$/, (match, p1) => `${Math.max(20, parseInt(p1) - 30)}%)`);
  } else {
    // In light mode, use lighter, more pastel versions
    return color.light.replace(/(\d+)%\)$/, (match, p1) => `${Math.min(85, parseInt(p1) + 25)}%)`);
  }
}
