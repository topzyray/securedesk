import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecureDesk",
  description: "A personal assistant that keeps the signed-in user's preferences with every API call.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="absolute top-4 left-4 z-50 -translate-y-24 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
