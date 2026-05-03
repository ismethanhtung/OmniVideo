import { describe, expect, it } from "vitest";

import {
  APP_FONT_OPTIONS,
  APP_THEME_OPTIONS,
  isAppFontKey,
  isAppThemeKey,
} from "./preferences";

describe("ui preferences", () => {
  it("supports ten font options", () => {
    expect(APP_FONT_OPTIONS).toHaveLength(10);
  });

  it("supports ten theme options", () => {
    expect(APP_THEME_OPTIONS).toHaveLength(10);
  });

  it("validates app font keys", () => {
    expect(isAppFontKey("inter")).toBe(true);
    expect(isAppFontKey("figtree")).toBe(true);
    expect(isAppFontKey("unknown-font")).toBe(false);
  });

  it("validates app theme keys", () => {
    expect(isAppThemeKey("dark3")).toBe(true);
    expect(isAppThemeKey("light-pastel-pink")).toBe(true);
    expect(isAppThemeKey("light-warm-paper")).toBe(true);
    expect(isAppThemeKey("sepia")).toBe(false);
  });
});
