import type { Metadata } from "next";
import { Geist, Geist_Mono, Silkscreen } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The pixel face, used for headings, labels and controls only.
 *
 * Deliberately never applied to a table cell or a figure: a pixel font renders
 * every digit as a small mosaic, and a column of them is markedly slower to
 * read than the sans. The look lives in the frame, the data stays legible.
 */
const pixel = Silkscreen({
  variable: "--font-pixel-face",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "501105",
    template: "%s | 501105",
  },
  description: "501105, the SOLLOS retail and distributor ERP",
  // An internal ops tool. Even once it sits behind a login, it should never be
  // something a search engine has a copy of. Paired with app/robots.ts.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus: focus:bg-sollos-navy focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
