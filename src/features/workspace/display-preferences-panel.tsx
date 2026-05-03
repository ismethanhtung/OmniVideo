import Image from "next/image";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    APP_FONT_OPTIONS,
    APP_THEME_OPTIONS,
    type AppFontKey,
    type AppThemeKey,
} from "@/lib/ui/preferences";

type DisplayPreferencesPanelProps = {
    section: LeftbarNavItem;
    appFont: AppFontKey;
    appTheme: AppThemeKey;
    onAppFontChange: (font: AppFontKey) => void;
    onAppThemeChange: (theme: AppThemeKey) => void;
};

export function DisplayPreferencesPanel({
    section,
    appFont,
    appTheme,
    onAppFontChange,
    onAppThemeChange,
}: DisplayPreferencesPanelProps) {
    const Icon = section.icon;

    return (
        <section className="overflow-hidden border border-main bg-main">
            <header className="border-b border-main bg-secondary/45 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted" />
                    <h1 className="text-[15px] font-semibold text-main">
                        {section.label}
                    </h1>
                </div>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
                    {section.description}
                </p>
            </header>

            <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
                <div className="border border-main bg-secondary/20 p-4">
                    <p className="text-[12px] font-semibold text-main">
                        Typography
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                        {APP_FONT_OPTIONS.length} font options.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {APP_FONT_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => onAppFontChange(option.key)}
                                className={`w-full border px-3 py-2 text-left text-[12px] font-semibold transition-colors ${
                                    appFont === option.key
                                        ? "border-main bg-main text-main"
                                        : "border-main bg-secondary text-muted hover:bg-main hover:text-main"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border border-main bg-secondary/20 p-4">
                    <p className="text-[12px] font-semibold text-main">
                        Appearance
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                        {APP_THEME_OPTIONS.length} theme options.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {APP_THEME_OPTIONS.map((option) => (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => onAppThemeChange(option.key)}
                                className={`border px-3 py-2 text-[11px] font-semibold transition-colors ${
                                    appTheme === option.key
                                        ? "border-main bg-main text-main"
                                        : "border-main bg-secondary text-muted hover:bg-main hover:text-main"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
