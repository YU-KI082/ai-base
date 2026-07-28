import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Fraunces, Sora } from "next/font/google";
import { getDictionary, resolveLocale } from "@ai-base/i18n";
import { GoogleAnalytics } from "@/components/google-analytics";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display-loaded",
});

const body = Sora({
  subsets: ["latin"],
  variable: "--font-body-loaded",
});

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);
  const t = getDictionary(locale).public;
  const verification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: {
      default: t.siteTitle,
      template: "%s",
    },
    description: t.homeDescription,
    openGraph: {
      siteName: "AI BASE",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "AI BASE",
      description: t.homeDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(verification ? { verification: { google: verification } } : {}),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get("locale")?.value);

  return (
    <html lang={locale}>
      <head>
        <GoogleAnalytics />
      </head>
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
