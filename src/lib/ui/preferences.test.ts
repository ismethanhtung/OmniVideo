import { describe, expect, it } from "vitest";

import {
  APP_FONT_OPTIONS,
  APP_THEME_OPTIONS,
  isAppFontKey,
  isAppThemeKey,
} from "./preferences";

describe("ui preferences", () => {
  it("supports five font options", () => {
    expect(APP_FONT_OPTIONS).toHaveLength(5);
  });

  it("supports seven theme options", () => {
    expect(APP_THEME_OPTIONS).toHaveLength(7);
  });

  it("validates app font keys", () => {
    expect(isAppFontKey("inter")).toBe(true);
    expect(isAppFontKey("unknown-font")).toBe(false);
  });

  it("validates app theme keys", () => {
    expect(isAppThemeKey("dark3")).toBe(true);
    expect(isAppThemeKey("light-pastel-pink")).toBe(true);
    expect(isAppThemeKey("sepia")).toBe(false);
  });
});
