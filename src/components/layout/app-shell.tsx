"use client";

import { useEffect, useState } from "react";

import { ContentRouter } from "@/components/layout/content-router";
import { DEFAULT_SECTION_ID } from "@/components/layout/navigation";
import { Leftbar } from "@/components/layout/leftbar";
import { Topbar } from "@/components/layout/topbar";
import type { AppSectionId } from "@/components/layout/types";
import {
    DEFAULT_APP_FONT,
    DEFAULT_APP_THEME,
    isAppFontKey,
    isAppThemeKey,
    type AppFontKey,
    type AppThemeKey,
} from "@/lib/ui/preferences";

export function AppShell() {
    const [activeSection, setActiveSection] =
        useState<AppSectionId>(DEFAULT_SECTION_ID);
    const [appTheme, setAppTheme] = useState<AppThemeKey>(DEFAULT_APP_THEME);
    const [appFont, setAppFont] = useState<AppFontKey>(DEFAULT_APP_FONT);
    const [contentVersion, setContentVersion] = useState(0);

    useEffect(() => {
        const root = document.documentElement;
        const storedTheme = window.localStorage.getItem("omnivideo-theme");
        const storedFont = window.localStorage.getItem("omnivideo-font");
        const initialTheme =
            storedTheme && isAppThemeKey(storedTheme)
                ? storedTheme
                : DEFAULT_APP_THEME;
        const initialFont =
            storedFont && isAppFontKey(storedFont)
                ? storedFont
                : DEFAULT_APP_FONT;

        setAppTheme(initialTheme);
        setAppFont(initialFont);
        root.setAttribute("data-app-font", initialFont);
        if (initialTheme === "light") {
            root.removeAttribute("data-theme");
            return;
        }

        root.setAttribute("data-theme", initialTheme);
    }, []);

    useEffect(() => {
        const handleNavigate = (event: Event) => {
            const sectionId = (event as CustomEvent<AppSectionId>).detail;

            if (sectionId) {
                setActiveSection(sectionId);
            }
        };

        window.addEventListener("omnivideo:navigate", handleNavigate);

        return () => {
            window.removeEventListener("omnivideo:navigate", handleNavigate);
        };
    }, []);

    const applyTheme = (theme: AppThemeKey) => {
        const root = document.documentElement;
        setAppTheme(theme);
        window.localStorage.setItem("omnivideo-theme", theme);
        if (theme === "light") {
            root.removeAttribute("data-theme");
            return;
        }
        root.setAttribute("data-theme", theme);
    };

    const applyFont = (font: AppFontKey) => {
        const root = document.documentElement;
        setAppFont(font);
        window.localStorage.setItem("omnivideo-font", font);
        root.setAttribute("data-app-font", font);
    };

    const toggleTheme = () => {
        applyTheme(appTheme === "light" ? "dark1" : "light");
    };

    return (
        <div className="flex h-screen min-h-screen bg-main text-main">
            <Leftbar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar
                    activeSection={activeSection}
                    onRefreshView={() => setContentVersion((prev) => prev + 1)}
                    themeMode={appTheme === "light" ? "light" : "dark"}
                    onToggleTheme={toggleTheme}
                />
                <ContentRouter
                    key={contentVersion}
                    activeSection={activeSection}
                    appTheme={appTheme}
                    appFont={appFont}
                    onAppThemeChange={applyTheme}
                    onAppFontChange={applyFont}
                />
            </div>
        </div>
    );
}
