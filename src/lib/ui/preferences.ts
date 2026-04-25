export type AppFontKey =
  | "inter"
  | "outfit"
  | "plus-jakarta-sans"
  | "ibm-plex-sans"
  | "space-grotesk";

export type AppThemeKey =
  | "light"
  | "light-pastel-pink"
  | "dark1"
  | "dark2"
  | "dark3"
  | "dark4"
  | "dark5";

export const APP_FONT_OPTIONS: Array<{ key: AppFontKey; label: string }> = [
  { key: "plus-jakarta-sans", label: "Plus Jakarta Sans" },
  { key: "inter", label: "Inter" },
  { key: "outfit", label: "Outfit" },
  { key: "ibm-plex-sans", label: "IBM Plex Sans" },
  { key: "space-grotesk", label: "Space Grotesk" },
];

export const APP_THEME_OPTIONS: Array<{ key: AppThemeKey; label: string }> = [
  { key: "light", label: "Light" },
  { key: "light-pastel-pink", label: "Light Pastel Pink" },
  { key: "dark1", label: "Dark Slate" },
  { key: "dark2", label: "Dark Ocean" },
  { key: "dark3", label: "Dark Violet" },
  { key: "dark4", label: "Dark Forest" },
  { key: "dark5", label: "Dark Mono" },
];

export const DEFAULT_APP_FONT: AppFontKey = "plus-jakarta-sans";
export const DEFAULT_APP_THEME: AppThemeKey = "light";

export function isAppFontKey(value: string): value is AppFontKey {
  return APP_FONT_OPTIONS.some((option) => option.key === value);
}

export function isAppThemeKey(value: string): value is AppThemeKey {
  return APP_THEME_OPTIONS.some((option) => option.key === value);
}
