import type { Metadata } from "next";

export const siteName = "Tokyo Movie Times";
export const siteDescription =
  "English-first cinema showtimes in Tokyo. Compare cinemas, movies, IMAX formats, languages, and seat availability.";
export const socialImageAlt =
  "Tokyo Movie Times preview with a cinema route mark and English-first Tokyo showtime planning details.";

export function getMetadataBase() {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";

  return new URL(url.startsWith("http") ? url : `https://${url}`);
}

export function createPageMetadata({
  title,
  description,
}: {
  title: string;
  description: string;
}): Metadata {
  const socialTitle = `${title} | ${siteName}`;

  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
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
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: {
        url: "/twitter-image.png",
        alt: socialImageAlt,
      },
    },
  };
}
