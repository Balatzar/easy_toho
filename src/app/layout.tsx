import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  getMetadataBase,
  siteDescription,
  siteName,
  socialImageAlt,
} from "./metadata-utils";
import { PendingNavigationProvider } from "./pending-link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  category: "entertainment",
  creator: siteName,
  publisher: siteName,
  referrer: "origin-when-cross-origin",
  keywords: [
    "Tokyo cinema",
    "Tokyo movie times",
    "Tokyo showtimes",
    "English subtitled movies Tokyo",
    "IMAX Tokyo",
    "TOHO Cinemas",
  ],
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: socialImageAlt,
      },
    ],
    siteName,
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: {
      url: "/twitter-image.png",
      alt: socialImageAlt,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PendingNavigationProvider>{children}</PendingNavigationProvider>
      </body>
    </html>
  );
}
