import type { Metadata } from "next";
import {
  Anton,
  Bebas_Neue,
  Bangers,
  Barlow_Condensed,
  Beau_Rivage,
  Be_Vietnam_Pro,
  Braah_One,
  Figtree,
  Freeman,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Lobster,
  Love_Light,
  Lovers_Quarrel,
  Manrope,
  Montserrat,
  Oswald,
  Outfit,
  Pacifico,
  Paytone_One,
  Plus_Jakarta_Sans,
  Public_Sans,
  Sriracha,
  Sora,
  Space_Grotesk,
  Urbanist,
  Yeseva_One,
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

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-thumb-oswald",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-thumb-bebas-neue",
  display: "swap",
});

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-thumb-anton",
  display: "swap",
});

const bangers = Bangers({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-bangers",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-barlow-condensed",
  display: "swap",
});

const beauRivage = Beau_Rivage({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-beau-rivage",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["700", "800", "900"],
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-be-vietnam-pro",
  display: "swap",
});

const braahOne = Braah_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-braah-one",
  display: "swap",
});

const freeman = Freeman({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-freeman",
  display: "swap",
});

const lobster = Lobster({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-lobster",
  display: "swap",
});

const loveLight = Love_Light({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-love-light",
  display: "swap",
});

const loversQuarrel = Lovers_Quarrel({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-lovers-quarrel",
  display: "swap",
});

const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-pacifico",
  display: "swap",
});

const paytoneOne = Paytone_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-paytone-one",
  display: "swap",
});

const sriracha = Sriracha({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-sriracha",
  display: "swap",
});

const yesevaOne = Yeseva_One({
  weight: "400",
  subsets: ["latin", "vietnamese"],
  variable: "--font-thumb-yeseva-one",
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
  oswald.variable,
  bebasNeue.variable,
  anton.variable,
  bangers.variable,
  barlowCondensed.variable,
  beauRivage.variable,
  beVietnamPro.variable,
  braahOne.variable,
  freeman.variable,
  lobster.variable,
  loveLight.variable,
  loversQuarrel.variable,
  pacifico.variable,
  paytoneOne.variable,
  sriracha.variable,
  yesevaOne.variable,
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
