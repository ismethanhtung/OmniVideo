import type { Metadata } from "next";
import {
  Figtree,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Manrope,
  Outfit,
  Plus_Jakarta_Sans,
  Public_Sans,
  Sora,
  Space_Grotesk,
  Urbanist,
} from "next/font/google";

import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-app-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-app-outfit",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-app-plus-jakarta",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-app-ibm-plex",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-app-space-grotesk",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-app-manrope",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-app-sora",
  display: "swap",
});

const urbanist = Urbanist({
  subsets: ["latin"],
  variable: "--font-app-urbanist",
  display: "swap",
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-app-public-sans",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-app-figtree",
  display: "swap",
});

const appFontVariableClassName = [
  inter.variable,
  outfit.variable,
  plusJakartaSans.variable,
  ibmPlexSans.variable,
  spaceGrotesk.variable,
  manrope.variable,
  sora.variable,
  urbanist.variable,
  publicSans.variable,
  figtree.variable,
  jetbrainsMono.variable,
].join(" ");

export const metadata: Metadata = {
  title: "OmniVideo",
  description: "OmniVideo leftbar scaffold",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-app-font="plus-jakarta-sans"
      className={appFontVariableClassName}
      suppressHydrationWarning
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
