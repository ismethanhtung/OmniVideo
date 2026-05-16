"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { ContentRouter } from "@/components/layout/content-router";
import {
    DEFAULT_SECTION_ID,
    resolveSectionFromSegment,
    toSectionPath,
} from "@/components/layout/navigation";
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
    const router = useRouter();
    const pathname = usePathname();
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

    const sectionCandidate = useMemo(
        () => (pathname === "/" ? "workspace" : pathname.replace(/^\/+/, "").split("/")[0]),
        [pathname],
    );
    const resolvedSection = useMemo(
        () => resolveSectionFromSegment(sectionCandidate),
        [sectionCandidate],
    );
    const activeSection: AppSectionId = resolvedSection ?? DEFAULT_SECTION_ID;
    const shouldWarnOnNavigate =
        activeSection === "workspace" ||
        activeSection === "chineseTranscription";

    const navigateToSection = (sectionId: AppSectionId) => {
        if (sectionId === activeSection) return;
        if (shouldWarnOnNavigate) {
            const confirmed = confirm(
                "You have in-progress work. Are you sure you want to leave this page?",
            );
            if (!confirmed) return;
        }
        router.push(toSectionPath(sectionId));
    };

    useEffect(() => {
        if (!resolvedSection) {
            router.replace(toSectionPath(DEFAULT_SECTION_ID));
            return;
        }
        const canonicalPath = toSectionPath(resolvedSection);
        if (pathname !== canonicalPath) {
            router.replace(canonicalPath);
        }
    }, [pathname, resolvedSection, router]);

    useEffect(() => {
        const handleNavigate = (event: Event) => {
            const sectionId = (event as CustomEvent<AppSectionId>).detail;

            if (sectionId) navigateToSection(sectionId);
        };

        window.addEventListener("omnivideo:navigate", handleNavigate);

        return () => {
            window.removeEventListener("omnivideo:navigate", handleNavigate);
        };
    }, [activeSection, shouldWarnOnNavigate, router]);

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
                onSectionChange={navigateToSection}
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
