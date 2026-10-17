export type SchoolSlug = "das" | "stmarys";

export interface SchoolTheme {
  slug: SchoolSlug;
  name: string;
  shortName: string;
  tagline: string;
  primary: string;
  interactive: string;
  hover: string;
  soft: string;
  accent: string;
  accentName: string;
}

export const SCHOOL_THEMES: Record<SchoolSlug, SchoolTheme> = {
  das: { slug: "das", name: "D.A.S Public School", shortName: "D.A.S", tagline: "Learn · Grow · Excel", primary: "#173B75", interactive: "#2563EB", hover: "#1D4ED8", soft: "#E9F1FF", accent: "#C49A52", accentName: "gold" },
  stmarys: { slug: "stmarys", name: "St Mary's High School", shortName: "St Mary's", tagline: "Knowledge · Character · Service", primary: "#51318B", interactive: "#7650C9", hover: "#6240A6", soft: "#F0EAFE", accent: "#65A895", accentName: "sage" },
};

export const SCHOOL_SLUGS = Object.keys(SCHOOL_THEMES) as SchoolSlug[];

export function themeFor(slug: string | undefined | null): SchoolTheme {
  return SCHOOL_THEMES[(slug as SchoolSlug) in SCHOOL_THEMES ? (slug as SchoolSlug) : "das"];
}
