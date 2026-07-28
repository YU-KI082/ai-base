import type { Metadata } from "next";
import { Fraunces, Sora } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = Sora({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "AI BASE — Discover AI tools",
    template: "%s",
  },
  description:
    "Discover, compare, and adopt AI tools — continuously evaluated by agents, published with human approval.",
  openGraph: {
    siteName: "AI BASE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI BASE",
    description:
      "Discover, compare, and adopt AI tools — evaluated by agents, published with humans.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
