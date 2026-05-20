import type { Metadata } from "next";
import {
  Agbalumo,
  Bangers,
  Baloo_2,
  Braah_One,
  Figtree,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Lobster,
  Manrope,
  Mitr,
  Montserrat,
  Outfit,
  Paytone_One,
  Plus_Jakarta_Sans,
  Prompt,
  Public_Sans,
  Sriracha,
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

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-thumb-montserrat",
  display: "swap",
});

const bangers = Bangers({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-bangers",
  display: "swap",
});

const baloo2 = Baloo_2({
  weight: ["700", "800"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-baloo-2",
  display: "swap",
});

const braahOne = Braah_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-braah-one",
  display: "swap",
});

const lobster = Lobster({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-lobster",
  display: "swap",
});

const mitr = Mitr({
  weight: ["600", "700"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-mitr",
  display: "swap",
});

const paytoneOne = Paytone_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-paytone-one",
  display: "swap",
});

const prompt = Prompt({
  weight: ["700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-prompt",
  display: "swap",
});

const sriracha = Sriracha({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-sriracha",
  display: "swap",
});

const agbalumo = Agbalumo({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-agbalumo",
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
  montserrat.variable,
  bangers.variable,
  baloo2.variable,
  braahOne.variable,
  lobster.variable,
  mitr.variable,
  paytoneOne.variable,
  prompt.variable,
  sriracha.variable,
  agbalumo.variable,
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
